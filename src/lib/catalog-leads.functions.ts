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
    const { data: row, error } = await supabaseAdmin
      .from("catalog_leads")
      .insert({
        name: data.name, email: data.email.toLowerCase(), phone: data.phone, consent: true,
        search_params: data.searchParams, product_ids: data.productIds,
      })
      .select("id, token")
      .single();
    if (error || !row) throw new Error("Não foi possível salvar sua lista. Tente novamente.");
    return { id: row.id, token: row.token, count: data.productIds.length };
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
      { idempotencyKey: `catalog-list-${lead.id}`, reference: lead.id, ctaUrl: catalogListUrl(SITE_URL, data.token) });
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
    return { searchParams: lead.search_params as Record<string, unknown>, createdAt: lead.created_at, products };
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
