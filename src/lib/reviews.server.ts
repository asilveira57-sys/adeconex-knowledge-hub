/** Server-only: envios de pedido de avaliação, tokens e resumo por IA. */
import { dueReviewEmail, reviewTokenExpiry } from "./reviews.shared";
import { SITE_URL, sendAppEmail } from "./app-emails.server";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export async function hashToken(token: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newToken(): string {
  const b = new Uint8Array(24);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Produtos de um pedido (únicos), com slug, para montar estrelas e página de avaliação. */
export async function orderProducts(orderId: string) {
  const db = await admin();
  const { data: items } = await db.from("order_items").select("product_id, product_name").eq("order_id", orderId);
  const ids = Array.from(new Set((items ?? []).map((i) => i.product_id).filter(Boolean)));
  if (!ids.length) return [];
  const { data: prods } = await db.from("products").select("id, name, slug").in("id", ids);
  return (prods ?? []).map((p) => ({ id: p.id, name: p.name, slug: p.slug as string }));
}

/** Pedido pago/entregue do usuário que contém o produto (compra verificada). */
export async function findVerifiedOrder(userId: string, productId: string): Promise<string | null> {
  const db = await admin();
  const { data } = await db
    .from("order_items")
    .select("order_id, orders!inner(user_id, status)")
    .eq("product_id", productId)
    .eq("orders.user_id", userId)
    .in("orders.status", ["pago", "em_preparacao", "aguardando_arte", "arte_aprovada", "em_producao", "enviado", "entregue"])
    .limit(1);
  return (data?.[0] as { order_id?: string } | undefined)?.order_id ?? null;
}

async function sendRequestEmail(kind: "request" | "reminder", order: { id: string; order_number: string; user_id: string }, existing?: { id: string }) {
  const db = await admin();
  const products = await orderProducts(order.id);
  if (!products.length) return;
  // Gera token novo a cada envio; o hash anterior deixa de valer.
  const token = newToken();
  const token_hash = await hashToken(token);
  const now = new Date().toISOString();
  if (existing) {
    await db.from("review_requests").update({
      token_hash, expires_at: reviewTokenExpiry().toISOString(),
      ...(kind === "request" ? { sent_at: now } : { reminder_sent_at: now }),
    }).eq("id", existing.id);
  } else {
    await db.from("review_requests").insert({
      order_id: order.id, user_id: order.user_id, token_hash, sent_at: now, expires_at: reviewTokenExpiry().toISOString(),
    });
  }
  const [{ data: userRes }, { data: profile }] = await Promise.all([
    db.auth.admin.getUserById(order.user_id),
    db.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle(),
  ]);
  const email = userRes?.user?.email;
  if (!email) return;
  const nome = ((profile as { full_name?: string | null } | null)?.full_name ?? "").split(" ")[0] || "cliente";
  const base = `${SITE_URL}/avaliar/${token}`;
  await sendAppEmail(kind === "request" ? "avaliacao-pedido" : "avaliacao-lembrete", email, { nome, numero_pedido: order.order_number }, {
    idempotencyKey: `review-${kind}-${order.id}`,
    reference: order.order_number,
    ctaUrl: base,
    extraData: {
      ratingItems: products.map((p) => ({
        name: p.name,
        links: [1, 2, 3, 4, 5].map((n) => `${base}?produto=${p.id}&nota=${n}&utm_source=email&utm_medium=review`),
      })),
    },
  });
}

/** Envia pedidos de avaliação vencidos (7 dias após entrega) e lembretes. */
export async function runReviewDispatch(limit = 40): Promise<{ requests: number; reminders: number }> {
  const db = await admin();
  let requests = 0;
  let reminders = 0;
  const cutoff = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString();

  // 1) Pedidos entregues há 7+ dias sem pedido de avaliação
  const { data: delivered } = await db
    .from("orders")
    .select("id, order_number, user_id, delivered_at, review_requests(id)")
    .eq("status", "entregue")
    .not("delivered_at", "is", null)
    .lte("delivered_at", cutoff)
    .gte("delivered_at", since)
    .order("delivered_at", { ascending: true })
    .limit(200);
  for (const o of delivered ?? []) {
    if (requests >= limit) break;
    const rr = (o as unknown as { review_requests: { id: string }[] | { id: string } | null }).review_requests;
    if (rr && (Array.isArray(rr) ? rr.length : true)) continue;
    if (!o.user_id) continue;
    const due = dueReviewEmail({ deliveredAt: o.delivered_at, sentAt: null, reminderSentAt: null, completedAt: null });
    if (due !== "request") continue;
    await sendRequestEmail("request", o as { id: string; order_number: string; user_id: string });
    requests++;
  }

  // 2) Lembretes
  const { data: pending } = await db
    .from("review_requests")
    .select("id, order_id, user_id, sent_at, reminder_sent_at, completed_at, orders(order_number, delivered_at)")
    .is("completed_at", null)
    .is("reminder_sent_at", null)
    .lte("sent_at", cutoff)
    .limit(limit);
  for (const r of pending ?? []) {
    const o = (r as unknown as { orders: { order_number: string; delivered_at: string | null } | null }).orders;
    if (!o) continue;
    const due = dueReviewEmail({ deliveredAt: o.delivered_at, sentAt: r.sent_at, reminderSentAt: r.reminder_sent_at, completedAt: r.completed_at });
    if (due !== "reminder") continue;
    await sendRequestEmail("reminder", { id: r.order_id, order_number: o.order_number, user_id: r.user_id }, { id: r.id });
    reminders++;
  }
  return { requests, reminders };
}

/** Roda o envio no máximo 1x por hora, disparado por visitas/admin. Nunca lança erro. */
export async function maybeRunReviewDispatch(): Promise<void> {
  try {
    const db = await admin();
    await db.from("review_dispatch_state").upsert({ id: 1 }, { onConflict: "id", ignoreDuplicates: true });
    const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { data: claimed } = await db
      .from("review_dispatch_state")
      .update({ last_run_at: new Date().toISOString() })
      .eq("id", 1)
      .lt("last_run_at", hourAgo)
      .select("id");
    if (!claimed?.length) return;
    await runReviewDispatch();
  } catch (e) {
    console.error("[reviews] dispatch falhou", e);
  }
}

/** Gera "o que os clientes destacam" a partir das avaliações aprovadas (Lovable AI). */
export async function refreshReviewHighlights(productId: string): Promise<void> {
  try {
    const db = await admin();
    const { data: prod } = await db.from("products").select("name, rating_count, review_highlights_count").eq("id", productId).maybeSingle();
    if (!prod || prod.rating_count < 3 || prod.rating_count === prod.review_highlights_count) return;
    const { data: reviews } = await db.from("product_reviews").select("rating, title, body")
      .eq("product_id", productId).eq("status", "approved").order("created_at", { ascending: false }).limit(40);
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !reviews?.length) return;
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Lovable-API-Key": apiKey, Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: "Você resume avaliações reais de clientes em português do Brasil. Liste de 3 a 5 pontos curtos (2 a 5 palavras cada) que os clientes mais mencionam, positivos ou negativos, separados por vírgula. Não invente nada que não esteja nas avaliações. Responda apenas com a lista.",
        input: `Produto: ${prod.name}\n\n${reviews.map((r) => `Nota ${r.rating}: ${r.title} — ${r.body}`).join("\n")}`,
      }),
    });
    if (!resp.ok || !resp.body) return;
    const reader = resp.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim()) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
        } catch { /* ignora */ }
      }
    }
    const text = out.trim().replace(/\s+/g, " ").slice(0, 300);
    if (!text) return;
    await db.from("products").update({ review_highlights: text, review_highlights_count: prod.rating_count }).eq("id", productId);
  } catch (e) {
    console.error("[reviews] highlights falhou", e);
  }
}
