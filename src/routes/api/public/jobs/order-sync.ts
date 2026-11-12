import { createFileRoute } from "@tanstack/react-router";

/**
 * Rotina de pedidos (chamar a cada 15–30 min por um agendador externo):
 * - reconcilia pagamentos pendentes com o Mercado Pago (se o webhook falhar);
 * - puxa nota fiscal, rastreio e situação da Olist e avisa o cliente.
 * Autenticação: header x-cron-key (ou ?key=) = ORDER_SYNC_CRON_SECRET,
 * ou REVIEW_CRON_SECRET enquanto o segredo próprio não existir.
 */
function authorized(request: Request) {
  const secret = process.env.ORDER_SYNC_CRON_SECRET || process.env.REVIEW_CRON_SECRET;
  const url = new URL(request.url);
  const given = request.headers.get("x-cron-key") ?? url.searchParams.get("key") ?? "";
  if (!secret || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

async function handle(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const { runOrderSync } = await import("@/lib/olist-sync.server");
    return Response.json({ ok: true, ...(await runOrderSync()) });
  } catch (e) {
    console.error("[order-sync] falhou", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/jobs/order-sync")({
  server: {
    handlers: { GET: ({ request }) => handle(request), POST: ({ request }) => handle(request) },
  },
});
