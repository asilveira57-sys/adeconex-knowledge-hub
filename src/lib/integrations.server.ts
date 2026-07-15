/**
 * Fase 11 — Integração com sistema interno (Olist / ERP).
 *
 * Helper server-only. NÃO importar em módulos client-reachable no top-level;
 * chame via `await import("@/lib/integrations.server")` dentro do handler.
 *
 * Estratégia:
 * - Monta payload canônico a partir dos dados do pedido (server-side).
 * - Faz POST com timeout curto + retry com backoff exponencial.
 * - Grava toda tentativa em `integration_logs` (sucesso ou falha).
 * - Falha aqui NUNCA cancela pedido; apenas retorna { ok:false } para o
 *   admin poder reenviar.
 */

const PROVIDER = "olist";
const ACTION = "create_order";
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 15_000;

export type SendResult =
  | { ok: true; response: unknown; status: number }
  | { ok: false; error: string; status?: number; response?: unknown };

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(to);
  }
}

async function buildPayload(supabaseAdmin: any, orderId: string) {
  const [{ data: order }, { data: items }, { data: addresses }, { data: payments }] =
    await Promise.all([
      supabaseAdmin.from("orders").select("*").eq("id", orderId).maybeSingle(),
      supabaseAdmin.from("order_items").select("*").eq("order_id", orderId),
      supabaseAdmin.from("order_addresses").select("*").eq("order_id", orderId),
      supabaseAdmin
        .from("payments")
        .select("provider, status, method, amount, external_id, currency")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
  if (!order) throw new Error("Pedido não encontrado");

  let customer: any = null;
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, whatsapp, cpf")
      .eq("id", order.user_id)
      .maybeSingle();
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
    customer = { ...(profile ?? {}), email: u?.user?.email ?? null };
  } catch {}

  let company: any = null;
  if (order.company_id) {
    const { data } = await supabaseAdmin
      .from("companies")
      .select("legal_name, trade_name, cnpj, ie")
      .eq("id", order.company_id)
      .maybeSingle();
    company = data ?? null;
  }

  return {
    order: {
      id: order.id,
      number: order.order_number,
      status: order.status,
      currency: order.currency,
      subtotal: Number(order.subtotal),
      shipping_total: Number(order.shipping_total),
      discount_total: Number(order.discount_total ?? 0),
      total: Number(order.total),
      payment_method: order.payment_method,
      shipping_carrier: order.shipping_carrier,
      shipping_service: order.shipping_service,
      requires_art: order.requires_art,
      created_at: order.created_at,
      paid_at: order.paid_at,
      notes: order.customer_notes,
    },
    customer,
    company,
    items: (items ?? []).map((i: any) => ({
      sku: i.product_sku,
      name: i.product_name,
      variant: i.variant_label,
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      subtotal: Number(i.subtotal),
      product_id: i.product_id,
      variant_id: i.variant_id,
    })),
    addresses: addresses ?? [],
    payment: payments?.[0] ?? null,
  };
}

async function logAttempt(
  supabaseAdmin: any,
  orderId: string,
  request: unknown,
  result: SendResult,
) {
  await supabaseAdmin.from("integration_logs").insert({
    provider: PROVIDER,
    action: ACTION,
    order_id: orderId,
    request: request as any,
    response: (("response" in result ? result.response : null) ?? null) as any,
    status_code: result.status ?? null,
    success: result.ok,
    error_message: result.ok ? null : result.error,
  });
}

export async function sendOrderToInternal(orderId: string): Promise<SendResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const endpoint = process.env.INTERNAL_SYSTEM_URL ?? process.env.OLIST_API_URL;
  const token = process.env.INTERNAL_SYSTEM_TOKEN ?? process.env.OLIST_API_TOKEN;

  const payload = await buildPayload(supabaseAdmin, orderId);

  if (!endpoint || !token) {
    const result: SendResult = {
      ok: false,
      error:
        "Integração não configurada (defina INTERNAL_SYSTEM_URL/OLIST_API_URL e o token).",
    };
    await logAttempt(supabaseAdmin, orderId, payload, result);
    return result;
  }

  let lastError = "unknown";
  let lastStatus: number | undefined;
  let lastResponse: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "X-Idempotency-Key": `${payload.order.number}:${payload.order.id}`,
          },
          body: JSON.stringify(payload),
        },
        TIMEOUT_MS,
      );
      lastStatus = res.status;
      const text = await res.text();
      try {
        lastResponse = text ? JSON.parse(text) : null;
      } catch {
        lastResponse = text;
      }
      if (res.ok) {
        const ok: SendResult = { ok: true, status: res.status, response: lastResponse };
        await logAttempt(supabaseAdmin, orderId, payload, ok);
        return ok;
      }
      lastError = `HTTP ${res.status}`;
      // 4xx (exceto 408/429) não vale a pena repetir
      if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
        break;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < MAX_ATTEMPTS) {
      const delay = 500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const fail: SendResult = {
    ok: false,
    error: lastError,
    status: lastStatus,
    response: lastResponse,
  };
  await logAttempt(supabaseAdmin, orderId, payload, fail);
  return fail;
}
