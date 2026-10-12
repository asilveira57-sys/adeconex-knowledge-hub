import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { APP_EMAILS, APP_EMAIL_KEYS, mergeTexts } from "./app-emails.shared";

async function assertEmailsStaff(context: { supabase: any; userId: string }) {
  const { data: staff } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!staff) throw new Error("Acesso negado");
}

export const adminListAppEmails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertEmailsStaff(context);
    const { data: rows } = await context.supabase.from("email_template_settings").select("*");
    const byKey = new Map((rows ?? []).map((r: any) => [r.key, r]));
    return APP_EMAILS.map((def) => {
      const row: any = byKey.get(def.key);
      return {
        key: def.key, group: def.group, name: def.name, when: def.when, variables: def.variables,
        internal: !!def.internal, defaults: def.defaults,
        enabled: row ? row.enabled !== false : true,
        updated_at: row?.updated_at ?? null,
        texts: mergeTexts(def.defaults, row),
      };
    });
  });

const textsSchema = z.object({
  subject: z.string().min(1).max(200),
  heading: z.string().max(200),
  intro: z.string().max(2000),
  body: z.string().max(5000),
  cta_label: z.string().max(60),
  closing: z.string().max(200),
});

export const adminSaveAppEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ key: z.enum(APP_EMAIL_KEYS), enabled: z.boolean(), texts: textsSchema }).parse(v))
  .handler(async ({ context, data }) => {
    await assertEmailsStaff(context);
    const { error } = await context.supabase.from("email_template_settings").upsert({
      key: data.key, enabled: data.enabled, ...data.texts, updated_by: context.userId, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetAppEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ key: z.enum(APP_EMAIL_KEYS) }).parse(v))
  .handler(async ({ context, data }) => {
    await assertEmailsStaff(context);
    const { error } = await context.supabase.from("email_template_settings").delete().eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSendTestAppEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ key: z.enum(APP_EMAIL_KEYS) }).parse(v))
  .handler(async ({ context, data }) => {
    await assertEmailsStaff(context);
    const email = (context.claims as any)?.email as string | undefined;
    if (!email) throw new Error("Seu usuário não tem e-mail");
    const { sendAppEmail } = await import("./app-emails.server");
    const r = await sendAppEmail(data.key, email, {
      nome: "Teste", numero_pedido: "ADC-TESTE", total: "R$ 100,00", transportadora: "Correios SEDEX",
      rastreio: "AB123456789BR", arquivo: "Driver de teste", empresa: "Empresa teste", email,
      telefone: "(27) 99999-0000", segmento: "Teste", mensagem: "Mensagem de teste",
    }, { idempotencyKey: `test-${data.key}-${crypto.randomUUID()}`, reference: "teste", force: true });
    return r;
  });

export const adminListEmailLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ key: z.string().max(60).optional(), days: z.number().int().min(1).max(365).default(30) }).parse(v ?? {}))
  .handler(async ({ context, data }) => {
    await assertEmailsStaff(context);
    let q = context.supabase.from("app_email_log").select("*")
      .gte("created_at", new Date(Date.now() - data.days * 86400_000).toISOString())
      .order("created_at", { ascending: false }).limit(300);
    if (data.key) q = q.eq("template_key", data.key);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/* ───────── Gatilhos públicos ───────── */

const recent = new Map<string, number>();
function rateLimit(id: string, ms = 30_000) {
  const now = Date.now();
  const last = recent.get(id) ?? 0;
  if (now - last < ms) throw new Error("Aguarde alguns segundos e tente novamente.");
  recent.set(id, now);
  if (recent.size > 5000) recent.clear();
}

export const submitContactForm = createServerFn({ method: "POST" })
  .inputValidator((v) =>
    z.object({
      nome: z.string().trim().min(2).max(120),
      empresa: z.string().trim().max(160).optional().default(""),
      email: z.string().trim().email().max(200),
      telefone: z.string().trim().max(40).optional().default(""),
      segmento: z.string().trim().max(120).optional().default(""),
      mensagem: z.string().trim().max(3000).optional().default(""),
    }).parse(v),
  )
  .handler(async ({ data }) => {
    rateLimit(`contact:${data.email.toLowerCase()}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("contact_submissions").insert({
      name: data.nome, company: data.empresa || null, email: data.email, phone: data.telefone || null,
      segment: data.segmento || null, message: data.mensagem || null,
    }).select("id").single();
    if (error) throw new Error("Não foi possível enviar agora. Tente pelo WhatsApp.");
    const { sendAppEmail, SITE_URL } = await import("./app-emails.server");
    const vars = { ...data, nome: data.nome.split(" ")[0] };
    await Promise.all([
      sendAppEmail("contato-confirmacao", data.email, vars, { idempotencyKey: `contato-confirmacao-${row.id}`, reference: data.email, ctaUrl: `${SITE_URL}/catalogo` }),
      sendAppEmail("contato-aviso-interno", null, { ...data }, { idempotencyKey: `contato-aviso-${row.id}`, reference: data.email }),
    ]);
    return { ok: true };
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((v) => z.object({ email: z.string().trim().email().max(200), source: z.string().max(60).optional() }).parse(v))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    rateLimit(`news:${email}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin.from("newsletter_subscribers").select("id").eq("email", email).maybeSingle();
    if (existing) return { ok: true, already: true };
    const { data: row, error } = await supabaseAdmin.from("newsletter_subscribers")
      .insert({ email, source: data.source ?? "rodape" }).select("id").single();
    if (error) throw new Error("Não foi possível inscrever agora.");
    const { sendAppEmail } = await import("./app-emails.server");
    await sendAppEmail("newsletter-inscricao", email, {}, { idempotencyKey: `newsletter-${row.id}`, reference: "newsletter" });
    return { ok: true, already: false };
  });

export const emailDownloadLink = createServerFn({ method: "POST" })
  .inputValidator((v) => z.object({ email: z.string().trim().email().max(200), slug: z.string().min(1).max(200) }).parse(v))
  .handler(async ({ data }) => {
    const email = data.email.toLowerCase();
    rateLimit(`dl:${email}:${data.slug}`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: item } = await supabaseAdmin.from("downloads").select("id, title, slug, is_published")
      .eq("slug", data.slug).maybeSingle();
    if (!item || (item as any).is_published === false) throw new Error("Download não encontrado");
    const { sendAppEmail, SITE_URL } = await import("./app-emails.server");
    const r = await sendAppEmail("download-link", email, { arquivo: item.title }, {
      idempotencyKey: `download-${item.id}-${email}-${new Date().toISOString().slice(0, 10)}`,
      reference: item.slug, ctaUrl: `${SITE_URL}/downloads/${item.slug}`,
    });
    return { ok: r.status === "sent" || r.status === "suppressed" };
  });

export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prev } = await supabaseAdmin.from("app_email_log").select("id")
      .eq("template_key", "boas-vindas").eq("reference", context.userId).limit(1);
    if (prev && prev.length) return { ok: true };
    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    const user = userRes?.user;
    if (!user?.email) return { ok: false };
    // Só para contas novas (criadas nas últimas 48h)
    if (Date.now() - new Date(user.created_at).getTime() > 48 * 3600_000) return { ok: true };
    const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", context.userId).maybeSingle();
    const { sendAppEmail, SITE_URL } = await import("./app-emails.server");
    await sendAppEmail("boas-vindas", user.email, { nome: profile?.full_name?.split(" ")[0] || "cliente" }, {
      idempotencyKey: `boas-vindas-${context.userId}`, reference: context.userId, ctaUrl: `${SITE_URL}/minha-conta`,
    });
    return { ok: true };
  });
