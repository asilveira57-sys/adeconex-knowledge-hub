import { createFileRoute } from "@tanstack/react-router";

async function handle(request: Request) {
  const secret = process.env.REVIEW_CRON_SECRET;
  const url = new URL(request.url);
  const given = request.headers.get("x-cron-key") ?? url.searchParams.get("key") ?? "";
  if (!secret || given.length !== secret.length) return new Response("Unauthorized", { status: 401 });
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  if (diff !== 0) return new Response("Unauthorized", { status: 401 });

  try {
    const { runReviewDispatch } = await import("@/lib/reviews.server");
    const result = await runReviewDispatch();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[review-cron] falhou", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/jobs/review-emails")({
  server: { handlers: { GET: ({ request }) => handle(request), POST: ({ request }) => handle(request) } },
});
