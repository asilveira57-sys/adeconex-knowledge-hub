import { getAppEmailDef, interpolate, mergeTexts, type AppEmailKey } from "./app-emails.shared";

export const SITE_URL = "https://adeconex.com.br";

type Vars = Record<string, string | null | undefined>;

/**
 * Envia um e-mail automático com os textos do admin. Nunca lança erro:
 * falhas são registradas no histórico e não interrompem o fluxo do site.
 */
export async function sendAppEmail(
  key: AppEmailKey,
  to: string | null | undefined,
  vars: Vars,
  opts: { idempotencyKey: string; reference?: string; ctaUrl?: string; force?: boolean; extraData?: Record<string, unknown> },
): Promise<{ status: "sent" | "suppressed" | "failed" | "disabled" | "skipped" }> {
  const def = getAppEmailDef(key);
  if (!def) return { status: "skipped" };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const recipient = def.internal ? "vendas@adeconex.com.br" : (to ?? "").trim();
  if (!recipient) return { status: "skipped" };

  const log = async (status: string, error_message?: string) => {
    const { error } = await supabaseAdmin.from("app_email_log").insert({
      template_key: key, recipient, status, error_message: error_message ?? null, reference: opts.reference ?? null,
    });
    if (error) console.error("[app-email] log falhou", error.message);
  };

  try {
    const { data: row } = await supabaseAdmin.from("email_template_settings").select("*").eq("key", key).maybeSingle();
    if (row && row.enabled === false && !opts.force) {
      await log("disabled");
      return { status: "disabled" };
    }
    const t = mergeTexts(def.defaults, row);
    const v = { link: opts.ctaUrl ?? SITE_URL, ...vars };
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const result = await sendTemplateEmail(key, recipient, {
      idempotencyKey: opts.idempotencyKey,
      replyTo: "vendas@adeconex.com.br",
      templateData: {
        subject: interpolate(t.subject, v),
        heading: interpolate(t.heading, v),
        intro: interpolate(t.intro, v),
        body: interpolate(t.body, v),
        ctaLabel: t.cta_label,
        ctaUrl: opts.ctaUrl ?? SITE_URL,
        closing: t.closing,
        ...(opts.extraData ?? {}),
      },
    });
    if (!result.sent) {
      await log("suppressed");
      return { status: "suppressed" };
    }
    await log("sent");
    return { status: "sent" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[app-email] envio falhou", key, msg);
    await log("failed", msg.slice(0, 500));
    return { status: "failed" };
  }
}

const brl = (n: number) => Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Monta variáveis do pedido e envia o e-mail para o cliente dono do pedido. */
export async function sendOrderEmail(key: AppEmailKey, orderId: string, extra?: { ctaUrl?: string; eventId?: string }) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders").select("id, order_number, total, user_id").eq("id", orderId).maybeSingle();
    if (!order?.user_id) return;
    const [{ data: userRes }, { data: profile }, { data: ship }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(order.user_id),
      supabaseAdmin.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle(),
      supabaseAdmin.from("shipments").select("carrier, service, tracking_code").eq("order_id", orderId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const email = userRes?.user?.email;
    if (!email) return;
    const nome = ((profile as any)?.full_name as string | null)?.split(" ")[0] || "cliente";
    await sendAppEmail(key, email, {
      nome,
      numero_pedido: order.order_number,
      total: brl(Number(order.total)),
      transportadora: ship ? [ship.carrier, ship.service].filter(Boolean).join(" ") : null,
      rastreio: ship?.tracking_code ?? null,
    }, {
      idempotencyKey: `${key}-${orderId}${extra?.eventId ? `-${extra.eventId}` : ""}`,
      reference: order.order_number,
      ctaUrl: extra?.ctaUrl ?? `${SITE_URL}/pedido/${orderId}`,
    });
  } catch (e) {
    console.error("[app-email] pedido", key, e);
  }
}

export async function isFirstOrder(userId: string, orderId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin.from("orders").select("id", { count: "exact", head: true })
    .eq("user_id", userId).neq("id", orderId);
  return (count ?? 0) === 0;
}
