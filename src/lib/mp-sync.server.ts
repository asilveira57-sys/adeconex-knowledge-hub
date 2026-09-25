/**
 * Reconciliação com Mercado Pago: consulta pagamentos pelo external_reference
 * (order.id) e aplica o status no pedido. Usado quando o webhook não chega.
 */
const MP_API = "https://api.mercadopago.com";

const ORDER_STATUS_BY_PAYMENT: Record<string, string> = {
  approved: "pago",
  authorized: "pago",
  in_process: "aguardando_pagamento",
  pending: "aguardando_pagamento",
  refunded: "estornado",
  charged_back: "estornado",
};

function mapMethod(pay: any): string {
  const t = pay.payment_type_id as string | undefined;
  if (t === "credit_card") return "credit_card";
  if (t === "debit_card") return "debit_card";
  if (t === "ticket") return "boleto";
  if (t === "bank_transfer" || pay.payment_method_id === "pix") return "pix";
  return "other";
}

export async function syncOrderWithMercadoPago(orderId: string) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return { synced: false, reason: "no_token" };
  const res = await fetch(
    `${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return { synced: false, reason: `mp_${res.status}` };
  const json: any = await res.json();
  const results: any[] = json?.results ?? [];
  if (!results.length) return { synced: false, reason: "no_payment" };
  const pay =
    results.find((p) => p.status === "approved" || p.status === "authorized") ?? results[0];
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return applyMercadoPagoPayment(supabaseAdmin, orderId, pay);
}

export async function applyMercadoPagoPayment(supabaseAdmin: any, orderId: string, pay: any) {
  const paymentStatus: string = pay.status ?? "pending";
  const method = mapMethod(pay);

  const { data: existingPay } = await supabaseAdmin
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const row = {
    status: paymentStatus,
    external_id: String(pay.id),
    method,
    amount: Number(pay.transaction_amount ?? 0),
    raw: pay,
  };
  let paymentId: string | null = existingPay?.id ?? null;
  if (paymentId) {
    await supabaseAdmin.from("payments").update(row).eq("id", paymentId);
  } else {
    const { data } = await supabaseAdmin
      .from("payments")
      .insert({ ...row, order_id: orderId, provider: "mercadopago", currency: pay.currency_id ?? "BRL" })
      .select("id")
      .single();
    paymentId = data?.id ?? null;
  }

  const next = ORDER_STATUS_BY_PAYMENT[paymentStatus];
  let becamePaid = false;
  if (next) {
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle();
    // Não regride pedidos já pagos/em andamento para "aguardando"
    const canChange =
      order &&
      order.status !== next &&
      (next !== "aguardando_pagamento" || order.status === "draft");
    if (canChange) {
      const patch: Record<string, unknown> = { status: next, payment_method: method };
      if (next === "pago") patch.paid_at = pay.date_approved ?? new Date().toISOString();
      await supabaseAdmin.from("orders").update(patch).eq("id", orderId);
      await supabaseAdmin.from("order_status_history").insert({
        order_id: orderId,
        from_status: order.status,
        to_status: next,
        comment: `Mercado Pago: ${paymentStatus}`,
      });
      becamePaid = next === "pago";
    }
  }
  if (becamePaid) {
    try {
      const { sendOrderToInternal } = await import("@/lib/integrations.server");
      await sendOrderToInternal(orderId);
    } catch (e) {
      console.error("[mp-sync] integração interna falhou", e);
    }
  }
  return { synced: true, status: paymentStatus, payment_id: paymentId };
}
