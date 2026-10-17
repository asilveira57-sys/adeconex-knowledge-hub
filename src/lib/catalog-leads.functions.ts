import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { catalogLeadSchema, catalogListUrl, LEAD_CHANNELS } from "./catalog-leads.shared";
import { loadShowcaseByIds } from "./catalog.functions";

const recent = new Map<string, number>();
function rateLimit(id: string, ms = 10_000) {
  const now = Date.now();
  if (now - (recent.get(id) ?? 0) < ms) throw new Error("Aguarde alguns segundos e tente novamente.");
  recent.set(id, now);
  if (recent.size > 5000) recent.clear();
}

/** Público: salva a pesquisa com os dados do lead e devolve o código da lista. */
export const createCatalogLead = createServerFn({ method: "POST" })
  .inputValidator((v) => catalogLeadSchema.parse(v))
  .handler(async ({ data }) => {
    rateLimit(`lead:${data.email.toLowerCase()}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Se a pessoa estiver logada, liga a pesquisa à conta dela.
    let userId: string | null = null;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const auth = getRequestHeader("authorization");
      if (auth?.startsWith("Bearer ")) {
        const { data: u } = await supabaseAdmin.auth.getUser(auth.slice(7));
        userId = u.user?.id ?? null;
      }
    } catch { /* visitante sem login */ }
    const { data: row, error } = await supabaseAdmin
      .from("catalog_leads")
      .insert({
        user_id: userId,
        name: data.name, email: data.email.toLowerCase(), phone: data.phone, consent: true,
        search_params: data.searchParams, product_ids: data.productIds,
      })
      .select("id, token")
      .single();
    if (error || !row) throw new Error("Não foi possível salvar sua lista. Tente novamente.");
    // Envio automático da lista para o e-mail informado.
    const { sendAppEmail, SITE_URL } = await import("./app-emails.server");
    const r = await sendAppEmail("catalogo-lista", data.email.toLowerCase(),
      { nome: data.name.split(" ")[0], quantidade: String(data.productIds.length) },
      { idempotencyKey: `catalog-list-${row.id}`, reference: row.id, ctaUrl: catalogListUrl(SITE_URL, row.token) });
    if (r.status === "sent") await supabaseAdmin.from("catalog_leads").update({ channels: ["email"] }).eq("id", row.id);
    return { id: row.id, token: row.token, count: data.productIds.length, emailStatus: r.status };
  });

/** Público: registra o canal escolhido e, se for e-mail, envia o link. */
export const recordCatalogLeadChannel = createServerFn({ method: "POST" })
  .inputValidator((v) => z.object({ token: z.string().min(10).max(64), channel: z.enum(LEAD_CHANNELS) }).parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lead } = await supabaseAdmin.from("catalog_leads")
      .select("id, name, email, channels, product_ids").eq("token", data.token).maybeSingle();
    if (!lead) throw new Error("Lista não encontrada");
    if (!lead.channels.includes(data.channel)) {
      await supabaseAdmin.from("catalog_leads").update({ channels: [...lead.channels, data.channel] }).eq("id", lead.id);
    }
    if (data.channel !== "email") return { ok: true };
    rateLimit(`lead-mail:${lead.id}`, 60_000);
    const { sendAppEmail, SITE_URL } = await import("./app-emails.server");
    const r = await sendAppEmail("catalogo-lista", lead.email,
      { nome: lead.name.split(" ")[0], quantidade: String(lead.product_ids.length) },
      { idempotencyKey: `catalog-list-${lead.id}-again-${Date.now()}`, reference: lead.id, ctaUrl: catalogListUrl(SITE_URL, data.token) });
    return { ok: r.status === "sent" || r.status === "suppressed" || r.status === "disabled" };
  });

/** Público: lista salva por código — nunca devolve dados pessoais do lead. */
export const getCatalogList = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ token: z.string().min(10).max(64) }).parse(v))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: lead } = await supabaseAdmin.from("catalog_leads")
      .select("search_params, product_ids, created_at").eq("token", data.token).maybeSingle();
    if (!lead) return null;
    const products = await loadShowcaseByIds(lead.product_ids);
    return { searchParams: (lead.search_params ?? {}) as Record<string, string | number | boolean>, createdAt: lead.created_at, products };
  });

export const adminListCatalogLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (!staff) throw new Error("Acesso negado");
    const { data, error } = await context.supabase.from("catalog_leads")
      .select("id, token, name, email, phone, search_params, product_ids, channels, created_at")
      .order("created_at", { ascending: false }).limit(1000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({ ...r, count: r.product_ids.length, product_ids: undefined }));
  });

export const adminCanExportLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { loadPermissions } = await import("./staff.functions");
    const p = await loadPermissions(context);
    return { canExport: p.canExportCustomers };
  });

/** Cliente logado: pesquisas salvas pela conta ou pelo mesmo e-mail. */
export const listMyCatalogLists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = String((context.claims as any)?.email ?? "").toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("catalog_leads").select("id, token, search_params, product_ids, created_at")
      .order("created_at", { ascending: false }).limit(100);
    q = email ? q.or(`user_id.eq.${context.userId},email.eq.${email}`) : q.eq("user_id", context.userId);
    const { data, error } = await q;
    if (error) throw new Error("Não foi possível carregar suas pesquisas.");
    return (data ?? []).map((r) => ({ id: r.id, token: r.token, createdAt: r.created_at, count: r.product_ids.length,
      searchParams: (r.search_params ?? {}) as Record<string, string | number | boolean> }));
  });

export const deleteMyCatalogList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const email = String((context.claims as any)?.email ?? "").toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin.from("catalog_leads").delete().eq("id", data.id);
    q = email ? q.or(`user_id.eq.${context.userId},email.eq.${email}`) : q.eq("user_id", context.userId);
    const { error } = await q;
    if (error) throw new Error("Não foi possível apagar.");
    return { ok: true };
  });
