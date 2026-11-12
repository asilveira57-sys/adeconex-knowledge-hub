import { createFileRoute } from "@tanstack/react-router";

/**
 * Webhook da Olist (Tiny): notificações de situação do pedido, nota fiscal
 * e código de rastreio. URL a cadastrar na Olist:
 *   https://adeconex.com.br/api/public/webhooks/olist?key=<ORDER_SYNC_CRON_SECRET>
 *
 * O corpo NÃO é confiado: só usamos o id para achar o pedido e consultamos
 * a API da Olist (syncOrderWithOlist). Sem id reconhecível, roda a rotina
 * completa (limitada).
 */
function authorized(request: Request) {
  const secret = process.env.ORDER_SYNC_CRON_SECRET || process.env.REVIEW_CRON_SECRET;
  const url = new URL(request.url);
  const given = url.searchParams.get("key") ?? request.headers.get("x-cron-key") ?? "";
  if (!secret || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

function candidateIds(body: any): string[] {
  const d = body?.dados ?? body?.data ?? body ?? {};
  const raw = [
    d.idPedido,
    d.id_pedido,
    d.idVendaTiny,
    d.idVenda,
    d.pedido?.id,
    d.id,
    body?.idPedido,
    body?.id,
  ];
  return [...new Set(raw.filter((v) => v != null && /^\d{1,15}$/.test(String(v))).map(String))];
}

export const Route = createFileRoute("/api/public/webhooks/olist")({
  server: {
    handlers: {
      GET: async () => new Response("olist webhook", { status: 200 }),
      POST: async ({ request }) => {
        if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
        const text = await request.text();
        let body: any = {};
        try {
          body = text ? JSON.parse(text) : {};
        } catch {
          body = Object.fromEntries(new URLSearchParams(text));
          if (typeof body.dados === "string") {
            try {
              body.dados = JSON.parse(body.dados);
            } catch {
              /* mantém texto */
            }
          }
        }
        try {
          const { findOrderByOlistId, syncOrderWithOlist, runOrderSync } =
            await import("@/lib/olist-sync.server");
          for (const id of candidateIds(body)) {
            const orderId = await findOrderByOlistId(id);
            if (orderId) {
              const r = await syncOrderWithOlist(orderId);
              return Response.json({ ok: true, matched: id, changes: r.changes });
            }
          }
          const r = await runOrderSync({ limit: 10 });
          return Response.json({ ok: true, matched: null, olist_changes: r.olist_changes });
        } catch (e) {
          console.error("[olist-webhook] falhou", e);
          return new Response("retry", { status: 502 });
        }
      },
    },
  },
});
