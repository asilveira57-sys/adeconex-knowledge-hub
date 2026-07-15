import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Fase 10 — Arquivos do pedido (bucket privado `order-files`).
 * Regra de path: `<user_id>/<order_id>/<uuid>-<slug>.<ext>` (a policy de storage
 * exige que o primeiro segmento do path seja o user_id do dono).
 * O upload é feito pelo cliente (browser) direto no bucket; o servidor apenas
 * registra/valida/gerencia as linhas em `order_files` e emite signed URLs.
 */

export const FILE_STATUSES = [
  "enviado",
  "em_analise",
  "aprovado",
  "rejeitado",
  "correcao_solicitada",
] as const;

export const FILE_STATUS_LABEL: Record<(typeof FILE_STATUSES)[number], string> = {
  enviado: "Enviado",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  correcao_solicitada: "Correção solicitada",
};

async function assertOwnerOrStaff(
  context: { supabase: any; userId: string },
  orderId: string,
) {
  const { data: order, error } = await context.supabase
    .from("orders")
    .select("id, user_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) throw new Error("Pedido não encontrado");
  if (order.user_id === context.userId) return { order, isStaff: false as const };
  const { data: staff } = await context.supabase.rpc("is_staff", {
    _user_id: context.userId,
  });
  if (!staff) throw new Error("Forbidden");
  return { order, isStaff: true as const };
}

export const listOrderFiles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ orderId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertOwnerOrStaff(context, data.orderId);
    const { data: rows, error } = await context.supabase
      .from("order_files")
      .select(
        "id, order_id, order_item_id, original_name, mime_type, size_bytes, storage_path, status, reviewer_notes, reviewer_id, reviewed_at, uploaded_by, created_at, updated_at",
      )
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { files: rows ?? [] };
  });

const registerInput = z.object({
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid().nullish(),
  storagePath: z.string().min(3).max(500),
  originalName: z.string().min(1).max(255),
  mimeType: z.string().max(150).nullish(),
  sizeBytes: z.number().int().min(0).max(50 * 1024 * 1024).nullish(),
});

export const registerOrderFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => registerInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertOwnerOrStaff(context, data.orderId);
    // Sanity check: path deve começar com <user_id>/<order_id>/
    const prefix = `${context.userId}/${data.orderId}/`;
    if (!data.storagePath.startsWith(prefix)) {
      throw new Error("Caminho de upload inválido");
    }
    const { data: row, error } = await context.supabase
      .from("order_files")
      .insert({
        order_id: data.orderId,
        order_item_id: data.orderItemId ?? null,
        storage_path: data.storagePath,
        original_name: data.originalName,
        mime_type: data.mimeType ?? null,
        size_bytes: data.sizeBytes ?? null,
        uploaded_by: context.userId,
        status: "enviado",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const getOrderFileSignedUrl = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ fileId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: file, error } = await context.supabase
      .from("order_files")
      .select("id, order_id, storage_path, original_name")
      .eq("id", data.fileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!file) throw new Error("Arquivo não encontrado");
    await assertOwnerOrStaff(context, file.order_id);
    const { data: signed, error: signErr } = await context.supabase.storage
      .from("order-files")
      .createSignedUrl(file.storage_path, 60 * 5, { download: file.original_name });
    if (signErr) throw new Error(signErr.message);
    return { url: signed.signedUrl, name: file.original_name };
  });

const reviewInput = z.object({
  fileId: z.string().uuid(),
  status: z.enum(["em_analise", "aprovado", "rejeitado", "correcao_solicitada"]),
  notes: z.string().max(2000).nullish(),
});

export const reviewOrderFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => reviewInput.parse(v))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (!staff) throw new Error("Forbidden");
    const { error } = await context.supabase
      .from("order_files")
      .update({
        status: data.status,
        reviewer_notes: data.notes ?? null,
        reviewer_id: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.fileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOrderFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ fileId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { data: file, error } = await context.supabase
      .from("order_files")
      .select("id, order_id, storage_path, status, uploaded_by")
      .eq("id", data.fileId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!file) throw new Error("Arquivo não encontrado");
    const { data: staff } = await context.supabase.rpc("is_staff", {
      _user_id: context.userId,
    });
    if (!staff) {
      if (file.uploaded_by !== context.userId) throw new Error("Forbidden");
      if (file.status !== "enviado") {
        throw new Error("Arquivo já foi analisado; contate o suporte para removê-lo.");
      }
    }
    // Remove do storage primeiro (best-effort) e depois a linha
    await context.supabase.storage.from("order-files").remove([file.storage_path]);
    const { error: delErr } = await context.supabase
      .from("order_files")
      .delete()
      .eq("id", file.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });
