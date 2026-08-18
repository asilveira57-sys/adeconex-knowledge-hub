import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Tela administrativa de artes: pedidos com etiqueta personalizada,
 * arte (thumbnail do editor), quantidade, status e envio da arte ao cliente.
 */

export type ArtworkRow = {
  order_id: string;
  order_number: string;
  order_status: string;
  created_at: string;
  customer_name: string | null;
  item_id: string;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  design_id: string | null;
  design_name: string | null;
  width_mm: number | null;
  height_mm: number | null;
  material: string | null;
  ribbon_color: string | null;
  thumbnail: string | null;
  art_files: number;
  art_sent_at: string | null;
};

export const listArtworkOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        status: z.string().optional(),
        search: z.string().max(120).optional(),
      })
      .parse(v ?? {}),
  )
  .handler(async ({ context, data }): Promise<ArtworkRow[]> => {
    const { assertStaff } = await import("./artwork.server");
    await assertStaff(context);

    const { data: items, error } = await context.supabase
      .from("order_items")
      .select(
        "id, order_id, product_name, variant_label, quantity, unit_price, subtotal, metadata, created_at",
      )
      .eq("metadata->>custom_label", "true")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const rows = items ?? [];
    if (rows.length === 0) return [];

    const orderIds = Array.from(new Set(rows.map((r: any) => r.order_id)));
    const designIds = Array.from(
      new Set(rows.map((r: any) => r.metadata?.design_id).filter(Boolean)),
    ) as string[];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [ordersRes, designsRes, filesRes] = await Promise.all([
      context.supabase
        .from("orders")
        .select("id, order_number, status, created_at, user_id")
        .in("id", orderIds),
      designIds.length
        ? supabaseAdmin
            .from("label_designs")
            .select("id, name, width_mm, height_mm, material, ribbon_color, thumbnail")
            .in("id", designIds)
        : Promise.resolve({ data: [] as any[] }),
      context.supabase
        .from("order_files")
        .select("id, order_id, order_item_id, created_at")
        .in("order_id", orderIds),
    ]);

    const orders = new Map<string, any>((ordersRes.data ?? []).map((o: any) => [o.id, o]));
    const designs = new Map<string, any>(((designsRes.data ?? []) as any[]).map((d) => [d.id, d]));

    const userIds = Array.from(new Set((ordersRes.data ?? []).map((o: any) => o.user_id)));
    const { data: profs } = userIds.length
      ? await context.supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as any[] };
    const names = new Map<string, string | null>((profs ?? []).map((p: any) => [p.id, p.full_name]));

    return rows
      .map((r: any): ArtworkRow => {
        const o = orders.get(r.order_id);
        const d = r.metadata?.design_id ? designs.get(r.metadata.design_id) : null;
        const files = (filesRes.data ?? []).filter((f: any) => f.order_item_id === r.id);
        return {
          order_id: r.order_id,
          order_number: o?.order_number ?? "—",
          order_status: o?.status ?? "—",
          created_at: o?.created_at ?? r.created_at,
          customer_name: o ? (names.get(o.user_id) ?? null) : null,
          item_id: r.id,
          product_name: r.product_name,
          variant_label: r.variant_label,
          quantity: Number(r.quantity),
          unit_price: Number(r.unit_price),
          subtotal: Number(r.subtotal),
          design_id: r.metadata?.design_id ?? null,
          design_name: r.metadata?.design_name ?? d?.name ?? null,
          width_mm: r.metadata?.width_mm ?? (d ? Number(d.width_mm) : null),
          height_mm: r.metadata?.height_mm ?? (d ? Number(d.height_mm) : null),
          material: r.metadata?.material ?? d?.material ?? null,
          ribbon_color: r.metadata?.ribbon_color ?? d?.ribbon_color ?? null,
          thumbnail: d?.thumbnail ?? null,
          art_files: files.length,
          art_sent_at: files.length
            ? files
                .map((f: any) => f.created_at)
                .sort()
                .slice(-1)[0]
            : null,
        };
      })
      .filter((row) => {
        if (data.status && data.status !== "all" && row.order_status !== data.status) return false;
        if (data.search) {
          const q = data.search.toLowerCase();
          return (
            row.order_number.toLowerCase().includes(q) ||
            (row.customer_name ?? "").toLowerCase().includes(q) ||
            (row.design_name ?? "").toLowerCase().includes(q)
          );
        }
        return true;
      });
  });

/** Envia a arte (PNG do editor) ao cliente: grava no pedido e notifica no histórico. */
export const sendArtworkToCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) =>
    z
      .object({
        order_item_id: z.string().uuid(),
        note: z.string().max(1000).optional(),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    const { assertStaff, dataUrlToBytes, slugifyFileName } = await import("./artwork.server");
    await assertStaff(context);

    const { data: item, error: itemErr } = await context.supabase
      .from("order_items")
      .select("id, order_id, product_name, metadata")
      .eq("id", data.order_item_id)
      .maybeSingle();
    if (itemErr) throw new Error(itemErr.message);
    if (!item) throw new Error("Item do pedido não encontrado");
    const designId = (item.metadata as any)?.design_id as string | undefined;
    if (!designId) throw new Error("Este item não possui arte personalizada");

    const { data: order, error: orderErr } = await context.supabase
      .from("orders")
      .select("id, user_id, status")
      .eq("id", item.order_id)
      .maybeSingle();
    if (orderErr) throw new Error(orderErr.message);
    if (!order) throw new Error("Pedido não encontrado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: design } = await supabaseAdmin
      .from("label_designs")
      .select("id, name, thumbnail")
      .eq("id", designId)
      .maybeSingle();
    if (!design?.thumbnail) throw new Error("Arte sem pré-visualização salva");

    const { bytes, contentType } = dataUrlToBytes(design.thumbnail);
    const ext = contentType.split("/")[1] === "jpeg" ? "jpg" : contentType.split("/")[1];
    const fileName = `arte-${slugifyFileName(design.name ?? "etiqueta")}-${Date.now()}.${ext}`;
    const storagePath = `${order.user_id}/${order.id}/${fileName}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("order-files")
      .upload(storagePath, bytes, { contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { error: insErr } = await context.supabase.from("order_files").insert({
      order_id: order.id,
      order_item_id: item.id,
      storage_path: storagePath,
      original_name: fileName,
      mime_type: contentType,
      size_bytes: bytes.byteLength,
      uploaded_by: context.userId,
      status: "em_analise",
      reviewer_notes: data.note ?? null,
    });
    if (insErr) throw new Error(insErr.message);

    if (order.status !== "aguardando_arte") {
      await context.supabase
        .from("orders")
        .update({ status: "aguardando_arte" })
        .eq("id", order.id);
    }
    await context.supabase.from("order_status_history").insert({
      order_id: order.id,
      from_status: order.status,
      to_status: "aguardando_arte",
      changed_by: context.userId,
      comment: data.note?.trim()
        ? `Arte enviada ao cliente: ${data.note.trim()}`
        : "Arte enviada ao cliente para aprovação",
    });

    return { ok: true };
  });
