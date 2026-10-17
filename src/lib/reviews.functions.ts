import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPermissions } from "./staff.functions";
import {
  REVIEW_MAX_IMAGES,
  REVIEW_MAX_VIDEOS,
  REVIEW_MIN_BODY,
  abbreviateName,
  computeRatingStats,
  isTokenExpired,
  isValidRating,
  moderationFlags,
} from "./reviews.shared";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export type PublicReview = {
  id: string;
  rating: number;
  title: string;
  body: string;
  display_name: string;
  city: string | null;
  verified_purchase: boolean;
  featured: boolean;
  helpful_count: number;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
  media: { id: string; kind: "image" | "video"; path: string }[];
};

export type ProductReviewsData = {
  stats: ReturnType<typeof computeRatingStats>;
  highlights: string | null;
  reviews: PublicReview[];
  total: number;
  mediaGallery: { id: string; kind: "image" | "video"; path: string; reviewId: string }[];
};

const listSchema = z.object({
  productId: z.string().uuid(),
  sort: z.enum(["recentes", "uteis", "maior", "menor"]).default("recentes"),
  filter: z.enum(["todas", "midia", "verificadas", "5", "4", "3", "2", "1"]).default("todas"),
  page: z.number().int().min(1).max(200).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

/** Avaliações aprovadas de um produto (público, SSR). */
export const getProductReviews = createServerFn({ method: "GET" })
  .inputValidator((v) => listSchema.parse(v))
  .handler(async ({ data }): Promise<ProductReviewsData> => {
    const db = await admin();
    const { data: all } = await db
      .from("product_reviews")
      .select("id, rating, title, body, display_name, city, verified_purchase, featured, helpful_count, admin_reply, replied_at, created_at, product_review_media(id, kind, storage_path, position)")
      .eq("product_id", data.productId)
      .eq("status", "approved")
      .limit(2000);
    const { data: prod } = await db.from("products").select("review_highlights").eq("id", data.productId).maybeSingle();
    const rows: PublicReview[] = (all ?? []).map((r) => ({
      id: r.id,
      rating: Number(r.rating),
      title: r.title,
      body: r.body,
      display_name: r.display_name,
      city: r.city,
      verified_purchase: r.verified_purchase,
      featured: r.featured,
      helpful_count: r.helpful_count,
      admin_reply: r.admin_reply,
      replied_at: r.replied_at,
      created_at: r.created_at,
      media: ((r as unknown as { product_review_media: { id: string; kind: string; storage_path: string; position: number }[] }).product_review_media ?? [])
        .sort((a, b) => a.position - b.position)
        .map((m) => ({ id: m.id, kind: m.kind as "image" | "video", path: m.storage_path })),
    }));
    const stats = computeRatingStats(rows.map((r) => r.rating));
    let list = rows;
    if (data.filter === "midia") list = list.filter((r) => r.media.length > 0);
    else if (data.filter === "verificadas") list = list.filter((r) => r.verified_purchase);
    else if (/^[1-5]$/.test(data.filter)) list = list.filter((r) => Math.floor(r.rating) === Number(data.filter) || (Number(data.filter) === 5 && r.rating === 5));
    const by = {
      recentes: (a: PublicReview, b: PublicReview) => Number(b.featured) - Number(a.featured) || b.created_at.localeCompare(a.created_at),
      uteis: (a: PublicReview, b: PublicReview) => b.helpful_count - a.helpful_count || b.created_at.localeCompare(a.created_at),
      maior: (a: PublicReview, b: PublicReview) => b.rating - a.rating || b.created_at.localeCompare(a.created_at),
      menor: (a: PublicReview, b: PublicReview) => a.rating - b.rating || b.created_at.localeCompare(a.created_at),
    }[data.sort];
    list = [...list].sort(by);
    const start = (data.page - 1) * data.pageSize;
    return {
      stats,
      highlights: stats.count >= 3 ? (prod?.review_highlights ?? null) : null,
      reviews: list.slice(start, start + data.pageSize),
      total: list.length,
      mediaGallery: rows.flatMap((r) => r.media.map((m) => ({ ...m, reviewId: r.id }))).slice(0, 24),
    };
  });

/** Últimas avaliações aprovadas da loja (página pública). */
export const getRecentReviews = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ limit: z.number().int().min(1).max(100).default(60) }).parse(v ?? {}))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: rows } = await db
      .from("product_reviews")
      .select("id, rating, title, body, display_name, city, verified_purchase, created_at, products!inner(name, slug, rating_avg, rating_count)")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    const { data: agg } = await db.from("product_reviews").select("rating").eq("status", "approved").limit(10000);
    return {
      stats: computeRatingStats((agg ?? []).map((r) => Number(r.rating))),
      reviews: (rows ?? []).map((r) => {
        const p = (r as unknown as { products: { name: string; slug: string; rating_avg: number | null; rating_count: number } }).products;
        return {
          id: r.id, rating: Number(r.rating), title: r.title, body: r.body, display_name: r.display_name, city: r.city,
          verified_purchase: r.verified_purchase, created_at: r.created_at,
          product: { name: p.name, slug: p.slug, rating_avg: p.rating_avg == null ? null : Number(p.rating_avg), rating_count: p.rating_count },
        };
      }),
    };
  });

/** Voto "foi útil" — um por visitante/usuário por avaliação. */
export const voteReviewHelpful = createServerFn({ method: "POST" })
  .inputValidator((v) => z.object({ reviewId: z.string().uuid(), voterKey: z.string().min(8).max(60).regex(/^[\w-]+$/) }).parse(v))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: rv } = await db.from("product_reviews").select("id, helpful_count, status").eq("id", data.reviewId).maybeSingle();
    if (!rv || rv.status !== "approved") return { ok: false, count: 0 };
    const { error } = await db.from("product_review_votes").insert({ review_id: data.reviewId, voter_key: data.voterKey });
    if (error) return { ok: false, count: rv.helpful_count };
    const { count } = await db.from("product_review_votes").select("id", { count: "exact", head: true }).eq("review_id", data.reviewId);
    await db.from("product_reviews").update({ helpful_count: count ?? rv.helpful_count + 1 }).eq("id", data.reviewId);
    return { ok: true, count: count ?? rv.helpful_count + 1 };
  });

// ---------- Envio de avaliação ----------

const mediaSchema = z.object({ kind: z.enum(["image", "video"]), path: z.string().min(5).max(300) });
const reviewInput = z.object({
  productId: z.string().uuid(),
  rating: z.number().refine(isValidRating, "Nota inválida"),
  title: z.string().trim().max(120).default(""),
  body: z.string().trim().min(REVIEW_MIN_BODY, `Escreva pelo menos ${REVIEW_MIN_BODY} caracteres`).max(4000),
  city: z.string().trim().max(80).optional().nullable(),
  media: z.array(mediaSchema).max(REVIEW_MAX_IMAGES + REVIEW_MAX_VIDEOS).default([]),
  accepted: z.literal(true),
});

async function saveReview(userId: string, input: z.infer<typeof reviewInput>, folderPrefix: string) {
  const db = await admin();
  if (input.media.filter((m) => m.kind === "image").length > REVIEW_MAX_IMAGES) throw new Error("Máximo de 5 fotos");
  if (input.media.filter((m) => m.kind === "video").length > REVIEW_MAX_VIDEOS) throw new Error("Máximo de 1 vídeo");
  if (input.media.some((m) => !m.path.startsWith(`${folderPrefix}/`) || m.path.includes(".."))) throw new Error("Arquivo inválido");
  const { data: prod } = await db.from("products").select("id, name").eq("id", input.productId).maybeSingle();
  if (!prod) throw new Error("Produto não encontrado");
  const { findVerifiedOrder } = await import("./reviews.server");
  const orderId = await findVerifiedOrder(userId, input.productId);
  const { data: profile } = await db.from("profiles").select("full_name").eq("id", userId).maybeSingle();
  const display_name = abbreviateName((profile as { full_name?: string | null } | null)?.full_name);
  const flags = moderationFlags(`${input.title} ${input.body}`);
  const row = {
    product_id: input.productId, user_id: userId, order_id: orderId, rating: input.rating, title: input.title, body: input.body,
    display_name, city: input.city || null, status: "pending", moderation_flags: flags, verified_purchase: !!orderId,
  };
  const { data: saved, error } = await db.from("product_reviews").upsert(row, { onConflict: "product_id,user_id" }).select("id").single();
  if (error || !saved) throw new Error(error?.message ?? "Não foi possível salvar");
  // Substitui mídias pelas enviadas agora (mantém as que continuam na lista)
  const { data: existing } = await db.from("product_review_media").select("id, storage_path").eq("review_id", saved.id);
  const keep = new Set(input.media.map((m) => m.path));
  const toDelete = (existing ?? []).filter((m) => !keep.has(m.storage_path));
  if (toDelete.length) {
    await db.from("product_review_media").delete().in("id", toDelete.map((m) => m.id));
    await db.storage.from("review-media").remove(toDelete.map((m) => m.storage_path));
  }
  const have = new Set((existing ?? []).map((m) => m.storage_path));
  const add = input.media.map((m, i) => ({ ...m, i })).filter((m) => !have.has(m.path));
  if (add.length) await db.from("product_review_media").insert(add.map((m) => ({ review_id: saved.id, kind: m.kind, storage_path: m.path, position: m.i })));
  if (orderId) await db.from("review_requests").update({ completed_at: new Date().toISOString() }).eq("order_id", orderId).is("completed_at", null);

  const { sendAppEmail, SITE_URL } = await import("./app-emails.server");
  await sendAppEmail("avaliacao-aviso-interno", null, {
    nome: display_name, produto: prod.name, nota: String(input.rating).replace(".", ","),
    mensagem: `${input.title ? input.title + "\n" : ""}${input.body}${flags.length ? `\n\nAtenção: ${flags.join(", ")}` : ""}${input.rating <= 2 ? "\n\nNota baixa — vale responder." : ""}`,
  }, { idempotencyKey: `review-staff-${saved.id}-${Date.now()}`, ctaUrl: `${SITE_URL}/admin/avaliacoes` });
  return { id: saved.id, verified: !!orderId };
}

async function signedUpload(folder: string, kind: "image" | "video", ext: string) {
  const db = await admin();
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || (kind === "image" ? "jpg" : "mp4");
  const allowed = kind === "image" ? ["jpg", "jpeg", "png", "webp", "heic"] : ["mp4", "mov", "webm", "m4v"];
  if (!allowed.includes(safeExt)) throw new Error("Formato não suportado");
  const path = `${folder}/${crypto.randomUUID()}.${safeExt}`;
  const { data, error } = await db.storage.from("review-media").createSignedUploadUrl(path);
  if (error || !data) throw new Error(error?.message ?? "Falha no upload");
  return { path, token: data.token };
}

export const getMyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("product_reviews")
      .select("id, rating, title, body, city, status, product_review_media(id, kind, storage_path, position)")
      .eq("product_id", data.productId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!r) return null;
    return {
      id: r.id, rating: Number(r.rating), title: r.title, body: r.body, city: r.city, status: r.status,
      media: ((r as unknown as { product_review_media: { kind: string; storage_path: string; position: number }[] }).product_review_media ?? [])
        .sort((a, b) => a.position - b.position).map((m) => ({ kind: m.kind as "image" | "video", path: m.storage_path })),
    };
  });

export const createReviewUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ kind: z.enum(["image", "video"]), ext: z.string().max(10) }).parse(v))
  .handler(async ({ data, context }) => signedUpload(context.userId, data.kind, data.ext));

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => reviewInput.parse(v))
  .handler(async ({ data, context }) => saveReview(context.userId, data, context.userId));

// ---------- Fluxo pelo link do e-mail (sem senha) ----------

async function resolveToken(token: string) {
  const { hashToken } = await import("./reviews.server");
  const db = await admin();
  const { data: rr } = await db.from("review_requests").select("id, order_id, user_id, expires_at, clicked_at").eq("token_hash", await hashToken(token)).maybeSingle();
  if (!rr) throw new Error("Link inválido. Peça um novo pelo WhatsApp (27) 99273-3033.");
  if (isTokenExpired(rr.expires_at)) throw new Error("Este link expirou. Entre na sua conta para avaliar pela página do produto.");
  return rr;
}

const tokenSchema = z.string().min(20).max(80).regex(/^[\w-]+$/);

export const getReviewRequest = createServerFn({ method: "POST" })
  .inputValidator((v) => z.object({ token: tokenSchema }).parse(v))
  .handler(async ({ data }) => {
    try {
      const rr = await resolveToken(data.token);
      const db = await admin();
      if (!rr.clicked_at) await db.from("review_requests").update({ clicked_at: new Date().toISOString() }).eq("id", rr.id);
      const { orderProducts } = await import("./reviews.server");
      const products = await orderProducts(rr.order_id);
      const { data: order } = await db.from("orders").select("order_number").eq("id", rr.order_id).maybeSingle();
      const { data: done } = await db.from("product_reviews").select("product_id, rating").eq("user_id", rr.user_id).in("product_id", products.map((p) => p.id));
      const doneMap = new Map((done ?? []).map((d) => [d.product_id, Number(d.rating)]));
      const { data: imgs } = await db.from("product_images").select("product_id, storage_path, source_url, is_main, position")
        .in("product_id", products.map((p) => p.id)).order("is_main", { ascending: false }).order("position");
      const img = new Map<string, string | null>();
      for (const i of imgs ?? []) if (!img.has(i.product_id)) img.set(i.product_id, i.source_url ?? null);
      return {
        ok: true as const,
        orderNumber: order?.order_number ?? "",
        products: products.map((p) => ({ ...p, image: img.get(p.id) ?? null, reviewed: doneMap.get(p.id) ?? null })),
      };
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : "Link inválido" };
    }
  });

export const createReviewUploadByToken = createServerFn({ method: "POST" })
  .inputValidator((v) => z.object({ token: tokenSchema, kind: z.enum(["image", "video"]), ext: z.string().max(10) }).parse(v))
  .handler(async ({ data }) => {
    const rr = await resolveToken(data.token);
    return signedUpload(rr.user_id, data.kind, data.ext);
  });

export const submitReviewByToken = createServerFn({ method: "POST" })
  .inputValidator((v) => reviewInput.extend({ token: tokenSchema }).parse(v))
  .handler(async ({ data }) => {
    const rr = await resolveToken(data.token);
    const { orderProducts } = await import("./reviews.server");
    const products = await orderProducts(rr.order_id);
    if (!products.some((p) => p.id === data.productId)) throw new Error("Produto não pertence a este pedido");
    const { token: _t, ...input } = data;
    return saveReview(rr.user_id, input, rr.user_id);
  });

// ---------- Admin ----------

async function requireReviewStaff(context: Parameters<typeof loadPermissions>[0]) {
  const perms = await loadPermissions(context);
  if (!perms.isStaff || !(perms.isAdmin || perms.sections.includes("avaliacoes"))) throw new Error("Forbidden");
}

export const listReviewsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ status: z.enum(["pending", "approved", "rejected", "hidden", "all"]).default("pending"), q: z.string().max(100).optional() }).parse(v))
  .handler(async ({ data, context }) => {
    await requireReviewStaff(context);
    const db = context.supabase;
    let q = db.from("product_reviews")
      .select("id, product_id, rating, title, body, display_name, city, status, rejection_reason, moderation_flags, admin_reply, featured, verified_purchase, helpful_count, created_at, products(name, slug), product_review_media(id, kind, storage_path)")
      .order("created_at", { ascending: false }).limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.q) q = q.or(`body.ilike.%${data.q.replace(/[%,()]/g, "")}%,title.ilike.%${data.q.replace(/[%,()]/g, "")}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const [{ count: pending }, { data: approved }, { count: sent }, { count: done }, { count: noReviews }] = await Promise.all([
      db.from("product_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
      db.from("product_reviews").select("rating").eq("status", "approved").limit(10000),
      db.from("review_requests").select("id", { count: "exact", head: true }).not("sent_at", "is", null),
      db.from("review_requests").select("id", { count: "exact", head: true }).not("completed_at", "is", null),
      db.from("products").select("id", { count: "exact", head: true }).eq("rating_count", 0).eq("status", "published"),
    ]);
    return {
      rows: rows ?? [],
      summary: {
        pending: pending ?? 0,
        stats: computeRatingStats((approved ?? []).map((r) => Number(r.rating))),
        emailsSent: sent ?? 0,
        emailsCompleted: done ?? 0,
        productsWithoutReviews: noReviews ?? 0,
      },
    };
  });

export const moderateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    id: z.string().uuid(),
    action: z.enum(["approve", "reject", "hide", "reply", "feature", "unfeature"]),
    reason: z.string().max(300).optional(),
    reply: z.string().max(2000).optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    await requireReviewStaff(context);
    const patch: Record<string, unknown> = {};
    if (data.action === "approve") Object.assign(patch, { status: "approved", rejection_reason: null });
    if (data.action === "reject") Object.assign(patch, { status: "rejected", rejection_reason: data.reason ?? null });
    if (data.action === "hide") patch.status = "hidden";
    if (data.action === "reply") Object.assign(patch, { admin_reply: data.reply?.trim() || null, replied_at: data.reply?.trim() ? new Date().toISOString() : null });
    if (data.action === "feature") patch.featured = true;
    if (data.action === "unfeature") patch.featured = false;
    const { data: row, error } = await context.supabase.from("product_reviews").update(patch).eq("id", data.id).select("product_id").single();
    if (error) throw new Error(error.message);
    if (data.action === "approve") {
      const { refreshReviewHighlights } = await import("./reviews.server");
      await refreshReviewHighlights(row.product_id);
    }
    return { ok: true };
  });

export const deleteReviewMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ mediaId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await requireReviewStaff(context);
    const db = await admin();
    const { data: m } = await db.from("product_review_media").select("storage_path").eq("id", data.mediaId).maybeSingle();
    if (!m) return { ok: true };
    await db.from("product_review_media").delete().eq("id", data.mediaId);
    await db.storage.from("review-media").remove([m.storage_path]);
    return { ok: true };
  });

export const runReviewEmailsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireReviewStaff(context);
    const { runReviewDispatch } = await import("./reviews.server");
    return runReviewDispatch();
  });
