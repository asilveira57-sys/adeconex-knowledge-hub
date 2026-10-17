import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPermissions } from "./staff.functions";
import { abbreviateName } from "./reviews.shared";
import {
  ANONYMOUS_LABEL, ANSWER_MAX, AVATAR_MAX_BYTES, AVATAR_PRESETS, AVATAR_STORAGE_PREFIX, QUESTIONS_PAGE_SIZE,
  QUESTIONS_PER_DAY, QUESTION_MAX, QUESTION_MIN, isAvatarPreset, normalizeToolPath, questionFingerprint, sniffImage,
  type PublicQuestion,
} from "./questions.shared";

const admin = async () => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

const target = z.discriminatedUnion("type", [
  z.object({ type: z.literal("product"), id: z.string().uuid() }),
  z.object({ type: z.literal("download"), id: z.string().uuid() }),
  z.object({ type: z.literal("tool"), path: z.string().max(200) }),
]);
type Target = z.infer<typeof target>;

const clean = (t: string) => t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/<[^>]*>/g, "").trim();

function toColumns(t: Target) {
  if (t.type === "product") return { content_type: "product", product_id: t.id, download_id: null, tool_path: null } as const;
  if (t.type === "download") return { content_type: "download", product_id: null, download_id: t.id, tool_path: null } as const;
  const p = normalizeToolPath(t.path);
  if (!p) throw new Error("Ferramenta inválida");
  return { content_type: "tool", product_id: null, download_id: null, tool_path: p } as const;
}

function avatarOf(profile: { avatar_url?: string | null; avatar_preset?: string | null } | null): PublicQuestion["avatar"] {
  if (!profile) return null;
  if (profile.avatar_url?.startsWith(AVATAR_STORAGE_PREFIX)) return { kind: "upload", path: profile.avatar_url.slice(AVATAR_STORAGE_PREFIX.length) };
  if (isAvatarPreset(profile.avatar_preset)) return { kind: "preset", key: profile.avatar_preset };
  return null;
}

// ---------- Público ----------

export const getPublishedQuestions = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ target, page: z.number().int().min(0).max(200).default(0) }).parse(v))
  .handler(async ({ data }): Promise<{ items: PublicQuestion[]; total: number }> => {
    const db = await admin();
    const cols = toColumns(data.target);
    let q = db.from("content_questions")
      .select("id, user_id, question, answer, published_at, identity_consent", { count: "exact" })
      .eq("status", "published").eq("content_type", cols.content_type);
    if (cols.product_id) q = q.eq("product_id", cols.product_id);
    if (cols.download_id) q = q.eq("download_id", cols.download_id);
    if (cols.tool_path) q = q.eq("tool_path", cols.tool_path);
    const from = data.page * QUESTIONS_PAGE_SIZE;
    const { data: rows, count, error } = await q.order("published_at", { ascending: false }).range(from, from + QUESTIONS_PAGE_SIZE - 1);
    if (error) throw new Error("Não foi possível carregar as perguntas");
    const consented = [...new Set((rows ?? []).filter((r) => r.identity_consent).map((r) => r.user_id))];
    const profiles = new Map<string, { full_name: string | null; avatar_url: string | null; avatar_preset: string | null }>();
    if (consented.length) {
      const { data: ps } = await db.from("profiles").select("id, full_name, avatar_url, avatar_preset").in("id", consented);
      for (const p of ps ?? []) profiles.set(p.id, p);
    }
    const verified = new Set<string>();
    if (cols.product_id && rows?.length) {
      const { findVerifiedOrder } = await import("./reviews.server");
      await Promise.all([...new Set(rows.map((r) => r.user_id))].map(async (u) => {
        if (await findVerifiedOrder(u, cols.product_id!)) verified.add(u);
      }));
    }
    return {
      total: count ?? 0,
      items: (rows ?? []).map((r) => {
        const p = r.identity_consent ? profiles.get(r.user_id) ?? null : null;
        return {
          id: r.id, question: r.question, answer: r.answer ?? "", publishedAt: r.published_at ?? "",
          author: p ? abbreviateName(p.full_name) : ANONYMOUS_LABEL,
          avatar: p ? avatarOf(p) : null,
          verified: verified.has(r.user_id),
        };
      }),
    };
  });

// ---------- Cliente ----------

export const getMyQuestionIdentity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: p } = await context.supabase.from("profiles").select("full_name, avatar_url, avatar_preset").eq("id", context.userId).maybeSingle();
    return { name: abbreviateName(p?.full_name), avatar: avatarOf(p ?? null) };
  });

export const submitQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    target,
    question: z.string().min(1).max(QUESTION_MAX + 200),
    consent: z.boolean(),
    website: z.string().max(0).optional(), // armadilha anti-robô
  }).parse(v))
  .handler(async ({ data, context }) => {
    const question = clean(data.question);
    if (question.length < QUESTION_MIN) throw new Error(`Escreva pelo menos ${QUESTION_MIN} caracteres.`);
    if (question.length > QUESTION_MAX) throw new Error(`Use no máximo ${QUESTION_MAX} caracteres.`);
    const cols = toColumns(data.target);
    const db = await admin();
    if (cols.product_id) {
      const { data: p } = await db.from("products").select("id").eq("id", cols.product_id).eq("status", "published").maybeSingle();
      if (!p) throw new Error("Produto não encontrado");
    }
    if (cols.download_id) {
      const { data: d } = await db.from("downloads").select("id").eq("id", cols.download_id).eq("is_published", true).maybeSingle();
      if (!d) throw new Error("Download não encontrado");
    }
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { data: recent } = await db.from("content_questions").select("question").eq("user_id", context.userId).gte("created_at", since);
    if ((recent ?? []).length >= QUESTIONS_PER_DAY) throw new Error(`Você já enviou ${QUESTIONS_PER_DAY} perguntas hoje. Tente novamente amanhã.`);
    const fp = questionFingerprint(question);
    if ((recent ?? []).some((r) => questionFingerprint(r.question) === fp)) throw new Error("Você já enviou essa pergunta. Ela está em análise.");
    const now = new Date().toISOString();
    const { data: row, error } = await db.from("content_questions").insert({
      ...cols, user_id: context.userId, question,
      identity_consent: data.consent, identity_consent_at: data.consent ? now : null,
    }).select("id").single();
    if (error || !row) throw new Error("Não foi possível enviar a pergunta");
    await db.from("content_question_events").insert({
      question_id: row.id, actor_id: context.userId, action: "enviada",
      note: data.consent ? "Autorizou publicar nome e avatar" : "Sem autorização de identidade (Anônimo)",
    });
    return { ok: true };
  });

// ---------- Avatar do perfil ----------

export const createAvatarUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const path = `${context.userId}/${crypto.randomUUID()}.img`;
    const { data, error } = await db.storage.from("avatars").createSignedUploadUrl(path);
    if (error || !data) throw new Error("Falha ao preparar envio");
    return { path, token: data.token };
  });

export const saveUploadedAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ path: z.string().max(200) }).parse(v))
  .handler(async ({ data, context }) => {
    if (!data.path.startsWith(`${context.userId}/`) || data.path.includes("..")) throw new Error("Arquivo inválido");
    const db = await admin();
    const { data: blob, error } = await db.storage.from("avatars").download(data.path);
    if (error || !blob) throw new Error("Arquivo não encontrado");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (bytes.byteLength > AVATAR_MAX_BYTES || !sniffImage(bytes)) {
      await db.storage.from("avatars").remove([data.path]);
      throw new Error("Envie uma imagem JPG, PNG ou WEBP de até 5 MB.");
    }
    const { data: prev } = await db.from("profiles").select("avatar_url").eq("id", context.userId).maybeSingle();
    await db.from("profiles").upsert({ id: context.userId, avatar_url: `${AVATAR_STORAGE_PREFIX}${data.path}`, avatar_preset: null });
    await removeOld(prev?.avatar_url, data.path);
    return { ok: true };
  });

async function removeOld(oldUrl: string | null | undefined, keep?: string) {
  if (!oldUrl?.startsWith(AVATAR_STORAGE_PREFIX)) return;
  const p = oldUrl.slice(AVATAR_STORAGE_PREFIX.length);
  if (p === keep) return;
  const db = await admin();
  await db.storage.from("avatars").remove([p]);
}

export const setAvatarPreset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ key: z.enum(AVATAR_PRESETS.map((p) => p.key) as [string, ...string[]]).nullable() }).parse(v))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: prev } = await db.from("profiles").select("avatar_url").eq("id", context.userId).maybeSingle();
    const keepUrl = prev?.avatar_url && !prev.avatar_url.startsWith(AVATAR_STORAGE_PREFIX) ? prev.avatar_url : null;
    await db.from("profiles").upsert({ id: context.userId, avatar_preset: data.key, avatar_url: keepUrl });
    await removeOld(prev?.avatar_url);
    return { ok: true };
  });

// ---------- Admin ----------

async function requireQuestionStaff(context: Parameters<typeof loadPermissions>[0]) {
  const perms = await loadPermissions(context);
  if (!perms.isStaff || !(perms.isAdmin || perms.sections.includes("perguntas"))) throw new Error("Sem permissão");
  return perms;
}

export const listQuestionsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    status: z.enum(["pending", "answered", "published", "cancelled", "all"]).default("pending"),
    type: z.enum(["product", "download", "tool", "all"]).default("all"),
    q: z.string().max(100).optional(),
    from: z.string().max(30).optional(),
    to: z.string().max(30).optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const perms = await requireQuestionStaff(context);
    const db = await admin();
    let q = db.from("content_questions")
      .select("id, user_id, content_type, product_id, download_id, tool_path, question, answer, status, identity_consent, identity_consent_at, answered_at, published_at, cancel_reason, created_at, products(name, slug), downloads(title, slug)")
      .order("created_at", { ascending: false }).limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.type !== "all") q = q.eq("content_type", data.type);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", `${data.to}T23:59:59.999-03:00`);
    if (data.q) { const s = data.q.replace(/[%,()]/g, ""); q = q.or(`question.ilike.%${s}%,answer.ilike.%${s}%`); }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
    const people = new Map<string, string>();
    if (ids.length) {
      const { data: ps } = await db.from("profiles").select("id, full_name").in("id", ids);
      for (const p of ps ?? []) people.set(p.id, p.full_name ?? "");
    }
    const counts: Record<string, number> = {};
    await Promise.all((["pending", "answered", "published", "cancelled"] as const).map(async (s) => {
      const { count } = await db.from("content_questions").select("id", { count: "exact", head: true }).eq("status", s);
      counts[s] = count ?? 0;
    }));
    return {
      canPublish: perms.isAdmin || perms.sections.includes("perguntas"),
      counts,
      rows: (rows ?? []).map((r) => {
        const prod = (r as unknown as { products: { name: string; slug: string } | null }).products;
        const dl = (r as unknown as { downloads: { title: string; slug: string } | null }).downloads;
        return {
          id: r.id, userId: r.user_id, customer: people.get(r.user_id) || "Cliente sem nome",
          type: r.content_type as "product" | "download" | "tool",
          contentLabel: prod?.name ?? dl?.title ?? r.tool_path ?? "—",
          contentUrl: prod ? `/produto/${prod.slug}` : dl ? `/downloads/${dl.slug}` : r.tool_path ?? "/",
          question: r.question, answer: r.answer, status: r.status as "pending" | "answered" | "published" | "cancelled",
          consent: r.identity_consent, consentAt: r.identity_consent_at,
          answeredAt: r.answered_at, publishedAt: r.published_at, cancelReason: r.cancel_reason, createdAt: r.created_at,
        };
      }),
    };
  });

export const getQuestionHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await requireQuestionStaff(context);
    const db = await admin();
    const { data: ev } = await db.from("content_question_events").select("id, actor_id, action, note, created_at").eq("question_id", data.id).order("created_at");
    const ids = [...new Set((ev ?? []).map((e) => e.actor_id).filter(Boolean) as string[])];
    const names = new Map<string, string>();
    if (ids.length) {
      const { data: ps } = await db.from("profiles").select("id, full_name").in("id", ids);
      for (const p of ps ?? []) names.set(p.id, p.full_name ?? "");
    }
    return (ev ?? []).map((e) => ({ ...e, actor: e.actor_id ? names.get(e.actor_id) || "Usuário" : "Sistema" }));
  });

export const moderateQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({
    id: z.string().uuid(),
    action: z.enum(["save_draft", "publish", "unpublish", "cancel", "reopen"]),
    answer: z.string().max(ANSWER_MAX + 200).optional(),
    reason: z.string().max(500).optional(),
    confirm: z.boolean().optional(),
  }).parse(v))
  .handler(async ({ data, context }) => {
    const perms = await requireQuestionStaff(context);
    const db = await admin();
    const { data: cur } = await db.from("content_questions").select("status, answer").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Pergunta não encontrada");
    const now = new Date().toISOString();
    const answer = data.answer !== undefined ? clean(data.answer) : cur.answer ?? "";
    if (answer.length > ANSWER_MAX) throw new Error(`Resposta com no máximo ${ANSWER_MAX} caracteres`);
    let patch: Database["public"]["Tables"]["content_questions"]["Update"] = {};
    let note: string | null = null;
    switch (data.action) {
      case "save_draft":
        if (cur.status === "cancelled") throw new Error("Reabra a pergunta antes de responder");
        patch = { answer: answer || null, answered_by: context.userId, answered_at: now, status: cur.status === "published" ? "published" : answer ? "answered" : "pending" };
        note = cur.status === "published" ? "Resposta publicada editada" : "Rascunho salvo";
        break;
      case "publish":
        if (!(perms.isAdmin || perms.sections.includes("perguntas"))) throw new Error("Sem permissão para publicar");
        if (!data.confirm) throw new Error("Confirme a publicação");
        if (cur.status === "cancelled") throw new Error("Reabra a pergunta antes de publicar");
        if (answer.length < 5) throw new Error("Escreva uma resposta válida antes de publicar");
        patch = { answer, answered_by: context.userId, answered_at: now, status: "published", published_by: context.userId, published_at: now };
        break;
      case "unpublish":
        patch = { status: "answered", published_at: null, published_by: null };
        break;
      case "cancel":
        patch = { status: "cancelled", cancel_reason: data.reason?.trim() || null, cancelled_at: now };
        note = data.reason?.trim() || null;
        break;
      case "reopen":
        if (cur.status !== "cancelled") throw new Error("Só perguntas canceladas podem ser reabertas");
        patch = { status: answer ? "answered" : "pending", cancel_reason: null, cancelled_at: null };
        break;
    }
    const { error } = await db.from("content_questions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    const label = { save_draft: "resposta salva", publish: "publicada", unpublish: "despublicada", cancel: "cancelada", reopen: "reaberta" }[data.action];
    await db.from("content_question_events").insert({ question_id: data.id, actor_id: context.userId, action: label, note });
    return { ok: true };
  });
