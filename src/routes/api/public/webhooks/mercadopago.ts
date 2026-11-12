import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Webhook do Mercado Pago.
 *
 * Segurança: o corpo da notificação NUNCA é usado como fonte de verdade.
 * Recebemos só o id, consultamos o pagamento na API do Mercado Pago com o
 * nosso token e aplicamos o status real. Por isso a assinatura (x-signature)
 * é verificada e registrada, mas uma assinatura ausente/diferente não
 * bloqueia o processamento — antes bloqueava, e nenhuma notificação era
 * aceita (payment_events vazio; pedidos só mudavam por sincronização manual).
 *
 * Formatos aceitos:
 * - Webhooks:  ?data.id=123&type=payment   ou body {type:"payment", data:{id}}
 * - IPN antigo: ?topic=payment&id=123 / ?topic=merchant_order&id=456
 *
 * Toda a regra de status + e-mails + Olist fica em applyMercadoPagoPayment
 * (src/lib/mp-sync.server.ts), a mesma usada pela sincronização manual.
 */

const MP_API = "https://api.mercadopago.com";

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

function signatureStatus(
  secret: string | undefined,
  header: string | null,
  dataId: string,
  requestId: string,
): "valid" | "invalid" | "missing" | "no_secret" {
  if (!secret) return "no_secret";
  const sig = parseSignature(header);
  if (!sig) return "missing";
  // Docs MP: id em minúsculas quando alfanumérico; partes vazias são omitidas.
  let manifest = `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${sig.ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  return safeEqualHex(expected, sig.v1) ? "valid" : "invalid";
}

const ok = () => new Response("ok", { status: 200 });

async function mpGet(path: string, token: string) {
  const res = await fetch(`${MP_API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`mp_${res.status}`);
  return res.json() as Promise<any>;
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      GET: async () => new Response("mercadopago webhook", { status: 200 }),
      POST: async ({ request }) => {
        const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
        if (!token) {
          console.error("[mp-webhook] MERCADOPAGO_ACCESS_TOKEN ausente");
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

        const topic = String(
          url.searchParams.get("type") ??
            url.searchParams.get("topic") ??
            body?.type ??
            body?.topic ??
            body?.action ??
            "unknown",
        );
        const rawId =
          url.searchParams.get("data.id") ??
          url.searchParams.get("id") ??
          body?.data?.id ??
          (typeof body?.resource === "string" ? body.resource.split("/").pop() : null) ??
          body?.id ??
          null;
        const dataId = rawId != null ? String(rawId) : "";
        if (!dataId || !/^[\w-]{1,64}$/.test(dataId)) return ok();

        const isPayment = /payment/i.test(topic);
        const isMerchantOrder = /merchant_order/i.test(topic);
        if (!isPayment && !isMerchantOrder) return ok();

        const sig = signatureStatus(
          process.env.MERCADOPAGO_WEBHOOK_SECRET,
          request.headers.get("x-signature"),
          dataId,
          request.headers.get("x-request-id") ?? "",
        );
        if (sig === "invalid")
          console.warn("[mp-webhook] assinatura não confere — validando pela API", dataId);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { applyMercadoPagoPayment, syncOrderWithMercadoPago } =
          await import("@/lib/mp-sync.server");

        try {
          if (isMerchantOrder) {
            const mo = await mpGet(`/merchant_orders/${dataId}`, token);
            const orderId = mo?.external_reference;
            if (orderId) await syncOrderWithMercadoPago(String(orderId));
            await supabaseAdmin.from("payment_events").insert({
              provider: "mercadopago",
              event_key: `mercadopago:merchant_order:${dataId}:${mo?.order_status ?? ""}:${mo?.last_updated ?? ""}`,
              event_type: `merchant_order (${sig})`,
              payload: { merchant_order_id: dataId, order_id: orderId ?? null, signature: sig },
            });
            return ok();
          }

          const pay = await mpGet(`/v1/payments/${dataId}`, token);
          const orderId: string | null = pay.external_reference ?? pay.metadata?.order_id ?? null;
          let paymentRowId: string | null = null;
          if (orderId) {
            const r: any = await applyMercadoPagoPayment(supabaseAdmin, String(orderId), pay);
            paymentRowId = r?.payment_id ?? null;
          } else {
            console.warn("[mp-webhook] pagamento sem external_reference", dataId);
          }
          // Registro para auditoria (único por pagamento + status + data de atualização)
          await supabaseAdmin.from("payment_events").insert({
            provider: "mercadopago",
            event_key: `mercadopago:payment:${pay.id}:${pay.status}:${pay.date_last_updated ?? ""}`,
            event_type: `payment.${pay.status} (${sig})`,
            payment_id: paymentRowId,
            payload: pay,
          });
          return ok();
        } catch (e) {
          console.error("[mp-webhook] falhou", dataId, e);
          // 5xx faz o Mercado Pago tentar de novo mais tarde
          return new Response("retry", { status: 502 });
        }
      },
    },
  },
});
