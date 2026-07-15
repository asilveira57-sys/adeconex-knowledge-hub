import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Webhook do Mercado Pago.
 *
 * - Verifica assinatura HMAC-SHA256 (header x-signature) contra
 *   MERCADOPAGO_WEBHOOK_SECRET, conforme docs oficiais.
 * - Idempotente via payment_events.event_key (único).
 * - Consulta o Mercado Pago com o payment_id para obter status real
 *   (nunca confia no body).
 * - Atualiza payments + orders + order_status_history.
 */

const MP_API = "https://api.mercadopago.com";

const ORDER_STATUS_BY_PAYMENT: Record<string, string> = {
  approved: "pago",
  authorized: "pago",
  in_process: "aguardando_pagamento",
  pending: "aguardando_pagamento",
  rejected: "cancelado",
  cancelled: "cancelado",
  refunded: "estornado",
  charged_back: "estornado",
};

function parseSignature(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.trim());
  const ts = parts.find((p) => p.startsWith("ts="))?.slice(3);
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
  return ts && v1 ? { ts, v1 } : null;
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const A = Buffer.from(a, "hex");
    const B = Buffer.from(b, "hex");
    if (A.length !== B.length || A.length === 0) return false;
    return timingSafeEqual(A, B);
  } catch {
    return false;
  }
}

async function ok() {
  return new Response("ok", { status: 200 });
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      GET: async () => new Response("mercadopago webhook", { status: 200 }),
      POST: async ({ request }) => {
        const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
        const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!secret || !token) {
          console.error("[mp-webhook] missing secrets");
          return new Response("misconfigured", { status: 500 });
        }

        const url = new URL(request.url);
        const rawBody = await request.text();
        let body: any = {};
        try {
          body = rawBody ? JSON.parse(rawBody) : {};
        } catch {
          body = {};
        }

        const dataId =
          url.searchParams.get("data.id") ??
          url.searchParams.get("id") ??
          body?.data?.id ??
          body?.id ??
          null;
        const eventType =
          url.searchParams.get("type") ?? body?.type ?? body?.action ?? "unknown";
        const requestId = request.headers.get("x-request-id") ?? "";
        const sig = parseSignature(request.headers.get("x-signature"));

        // Sem assinatura => rejeita
        if (!sig || !dataId) {
          console.warn("[mp-webhook] missing signature or data.id");
          return new Response("invalid", { status: 401 });
        }

        // Manifest exato conforme docs MP:
        // id:<data.id>;request-id:<x-request-id>;ts:<ts>;
        const manifest = `id:${dataId};request-id:${requestId};ts:${sig.ts};`;
        const expected = createHmac("sha256", secret).update(manifest).digest("hex");
        if (!safeEqualHex(expected, sig.v1)) {
          console.warn("[mp-webhook] invalid signature");
          return new Response("invalid signature", { status: 401 });
        }

        // Só processamos notificações de pagamento
        if (!/payment/i.test(String(eventType))) {
          return ok();
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const eventKey = `mercadopago:${eventType}:${dataId}:${sig.ts}`;

        // Idempotência: se o evento já foi registrado, retorna 200
        const { data: existing } = await supabaseAdmin
          .from("payment_events")
          .select("id")
          .eq("event_key", eventKey)
          .maybeSingle();
        if (existing) return ok();

        // Consulta o pagamento real no MP
        const payRes = await fetch(`${MP_API}/v1/payments/${dataId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!payRes.ok) {
          console.error("[mp-webhook] MP fetch failed", payRes.status);
          return new Response("mp fetch failed", { status: 502 });
        }
        const pay: any = await payRes.json();

        const orderId: string | null =
          pay.external_reference ?? pay.metadata?.order_id ?? null;
        if (!orderId) {
          console.warn("[mp-webhook] payment sem external_reference", dataId);
          await supabaseAdmin.from("payment_events").insert({
            event_key: eventKey,
            event_type: String(eventType),
            provider: "mercadopago",
            payload: pay,
          });
          return ok();
        }

        const paymentStatus: string = pay.status ?? "pending";
        const method: string | null = (() => {
          const t = pay.payment_type_id as string | undefined;
          if (t === "credit_card") return "credit_card";
          if (t === "debit_card") return "debit_card";
          if (t === "ticket") return "boleto";
          if (t === "bank_transfer" || pay.payment_method_id === "pix") return "pix";
          return "other";
        })();

        // Upsert payment (uma linha por preference/order)
        const { data: existingPay } = await supabaseAdmin
          .from("payments")
          .select("id, status")
          .eq("order_id", orderId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let paymentRowId: string | null = existingPay?.id ?? null;
        if (paymentRowId) {
          await supabaseAdmin
            .from("payments")
            .update({
              status: paymentStatus as any,
              external_id: String(pay.id),
              method: method as any,
              amount: Number(pay.transaction_amount ?? 0),
              raw: pay,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentRowId);
        } else {
          const { data: inserted } = await supabaseAdmin
            .from("payments")
            .insert({
              order_id: orderId,
              provider: "mercadopago",
              external_id: String(pay.id),
              status: paymentStatus as any,
              method: method as any,
              amount: Number(pay.transaction_amount ?? 0),
              currency: pay.currency_id ?? "BRL",
              raw: pay,
            })
            .select("id")
            .single();
          paymentRowId = inserted?.id ?? null;
        }

        // Registra evento (idempotência)
        await supabaseAdmin.from("payment_events").insert({
          event_key: eventKey,
          event_type: String(eventType),
          provider: "mercadopago",
          payment_id: paymentRowId,
          payload: pay,
        });

        // Atualiza pedido
        const nextOrderStatus = ORDER_STATUS_BY_PAYMENT[paymentStatus];
        if (nextOrderStatus) {
          const { data: order } = await supabaseAdmin
            .from("orders")
            .select("id, status")
            .eq("id", orderId)
            .maybeSingle();
          if (order && order.status !== nextOrderStatus) {
            const patch: Record<string, unknown> = {
              status: nextOrderStatus as any,
              payment_method: method,
            };
            if (nextOrderStatus === "pago") patch.paid_at = new Date().toISOString();
            if (nextOrderStatus === "cancelado")
              patch.cancelled_at = new Date().toISOString();
            await supabaseAdmin.from("orders").update(patch).eq("id", orderId);
            await supabaseAdmin.from("order_status_history").insert({
              order_id: orderId,
              from_status: order.status as any,
              to_status: nextOrderStatus as any,
              comment: `Mercado Pago: ${paymentStatus}`,
            });
          }
        }

        return ok();
      },
    },
  },
});
