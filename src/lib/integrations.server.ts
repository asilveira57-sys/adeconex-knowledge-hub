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
      .select("legal_name, trade_name, cnpj, ie:state_registration")
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

const TINY_URL = "https://api.tiny.com.br/api2/pedido.incluir.php";

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");
const fmtDate = (iso: string | null | undefined) => {
  const d = iso ? new Date(iso) : new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const PAY_LABEL: Record<string, string> = {
  pix: "pix",
  credit_card: "credito",
  debit_card: "debito",
  boleto: "boleto",
  ticket: "boleto",
  bank_transfer: "pix",
};

/** Converte o payload canônico no formato do Olist ERP (Tiny API v2). */
function toTinyOrder(p: Awaited<ReturnType<typeof buildPayload>>) {
  const addr: any =
    p.addresses.find((a: any) => a.kind === "billing") ??
    p.addresses.find((a: any) => a.kind === "shipping") ??
    p.addresses[0] ??
    {};
  const ship: any = p.addresses.find((a: any) => a.kind === "shipping") ?? addr;
  const doc = digits(p.company?.cnpj ?? p.customer?.cpf ?? addr.recipient_document);
  const isPJ = doc.length === 14;
  const nome = isPJ
    ? p.company?.legal_name ?? p.company?.trade_name ?? addr.recipient_name
    : p.customer?.full_name ?? addr.recipient_name;

  const cliente: Record<string, unknown> = {
    nome: nome || "Cliente Adeconex",
    tipo_pessoa: isPJ ? "J" : "F",
    cpf_cnpj: doc || undefined,
    ie: isPJ ? p.company?.ie ?? undefined : undefined,
    nome_fantasia: isPJ ? p.company?.trade_name ?? undefined : undefined,
    endereco: addr.street,
    numero: addr.number,
    complemento: addr.complement ?? undefined,
    bairro: addr.district,
    cep: digits(addr.zip),
    cidade: addr.city,
    uf: addr.state,
    fone: p.customer?.phone ?? p.customer?.whatsapp ?? addr.phone ?? undefined,
    email: p.customer?.email ?? addr.email ?? undefined,
    atualizar_cliente: "S",
  };

  const pedido: Record<string, unknown> = {
    data_pedido: fmtDate(p.order.created_at),
    numero_pedido_ecommerce: p.order.number,
    cliente,
    itens: p.items.map((i: any) => ({
      item: {
        codigo: i.sku ?? undefined,
        descricao: [i.name, i.variant].filter(Boolean).join(" - "),
        unidade: "UN",
        quantidade: i.quantity,
        valor_unitario: i.unit_price.toFixed(2),
      },
    })),
    valor_frete: p.order.shipping_total.toFixed(2),
    valor_desconto: p.order.discount_total.toFixed(2),
    forma_pagamento: PAY_LABEL[String(p.order.payment_method ?? "")] ?? undefined,
    nome_transportador: p.order.shipping_carrier ?? undefined,
    forma_frete: p.order.shipping_service ?? undefined,
    situacao: p.order.paid_at ? "aprovado" : "aberto",
    obs: [p.order.notes, `Pedido site ${p.order.number}`].filter(Boolean).join(" | "),
  };
  if (ship && ship !== addr) {
    pedido.endereco_entrega = {
      tipo_pessoa: isPJ ? "J" : "F",
      cpf_cnpj: digits(ship.recipient_document) || undefined,
      endereco: ship.street,
      numero: ship.number,
      complemento: ship.complement ?? undefined,
      bairro: ship.district,
      cep: digits(ship.zip),
      cidade: ship.city,
      uf: ship.state,
      fone: ship.phone ?? undefined,
      nome_destinatario: ship.recipient_name,
    };
  }
  return { pedido };
}

export async function sendOrderToInternal(orderId: string): Promise<SendResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const token = process.env.OLIST_API_TOKEN;
  const payload = await buildPayload(supabaseAdmin, orderId);
  const tiny = toTinyOrder(payload);

  if (!token) {
    const result: SendResult = { ok: false, error: "Token da Olist não configurado." };
    await logAttempt(supabaseAdmin, orderId, tiny, result);
    return result;
  }

  let lastError = "unknown";
  let lastStatus: number | undefined;
  let lastResponse: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const body = new URLSearchParams({
        token,
        formato: "JSON",
        pedido: JSON.stringify(tiny),
      });
      const res = await fetchWithTimeout(
        TINY_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
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
      const ret: any = (lastResponse as any)?.retorno;
      if (res.ok && ret?.status === "OK") {
        const reg = ret.registros?.[0]?.registro ?? ret.registros?.registro;
        if (reg && reg.status && reg.status !== "OK") {
          lastError = collectErrors(reg.erros) || "Erro ao incluir pedido";
          break;
        }
        const ok: SendResult = { ok: true, status: res.status, response: lastResponse };
        await logAttempt(supabaseAdmin, orderId, tiny, ok);
        return ok;
      }
      if (ret) {
        const reg = ret.registros?.[0]?.registro ?? ret.registros?.registro;
        lastError = collectErrors(ret.erros ?? reg?.erros) || `Olist: ${ret.status ?? "erro"}`;
        // Erro de validação (status_processamento 3 = erro) — não repetir, exceto limite de API
        if (!/limite|bloquead|tente novamente/i.test(lastError)) break;
      } else {
        lastError = `HTTP ${res.status}`;
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) break;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < MAX_ATTEMPTS) {
      const delay = 500 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const fail: SendResult = { ok: false, error: lastError, status: lastStatus, response: lastResponse };
  await logAttempt(supabaseAdmin, orderId, tiny, fail);
  return fail;
}

function collectErrors(erros: any): string {
  if (!erros) return "";
  const arr = Array.isArray(erros) ? erros : [erros];
  return arr
    .map((e: any) => (typeof e === "string" ? e : e?.erro ?? JSON.stringify(e)))
    .join("; ");
}
