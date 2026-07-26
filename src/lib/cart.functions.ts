import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Cart server functions. Prices are ALWAYS resolved server-side from the
 * database — never trusted from the client payload.
 */

const BUCKET = "catalog-media";

function publicUrl(base: string, path: string | null): string | null {
  if (!path) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path.replace(/^\/+/, "")}`;
}

import type { BundleApplication } from "./bundles.shared";
import { computeBundleApplications } from "./bundles.shared";
import { loadActiveOffersMatchingProducts } from "./bundles.functions";

export type CartLine = {
  item_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  product_slug: string;
  variant_label: string | null;
  sku: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
  image_url: string | null;
  max_stock: number | null;
  /** Unidades por caixa quando a linha é um kit fechado (1 = venda avulsa). */
  units_per_pack: number;
  /** Produto vendido apenas em kits fechados. */
  sells_by_kit: boolean;
  /** Marcado quando a linha foi adicionada via oferta de Compre Junto. */
  bundle_offer_id: string | null;
  /** Marca se essa linha está contribuindo para um desconto de Compre Junto. */
  bundle_applied: boolean;
};

export type CartSnapshot = {
  cart_id: string | null;
  currency: string;
  items: CartLine[];
  /** Soma dos line_total (sem descontos de Compre Junto). */
  subtotal_full: number;
  /** Total descontado por Compre Junto. */
  bundle_discount_total: number;
  /** Subtotal já com os descontos de Compre Junto aplicados. */
  subtotal: number;
  item_count: number;
  bundle_discounts: BundleApplication[];
};



async function ensureCart(supabase: any, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data: created, error } = await supabase
    .from("carts")
    .insert({ user_id: userId, status: "active" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id;
}

/** Resolve current price + stock + labels for a (product, variant?) pair.
 *  Quando o produto vende por kit, exige variant_id de um kit ativo e retorna
 *  o "estoque em caixas" já resolvido (own vs derived).
 */
async function resolveLineData(
  supabase: any,
  product_id: string,
  variant_id: string | null,
) {
  const { data: p } = await supabase
    .from("products")
    .select("id, name, slug, sku, price, promotional_price, is_available, stock_quantity, sells_by_kit")
    .eq("id", product_id)
    .maybeSingle();
  if (!p) throw new Error("Produto não encontrado");
  if (!p.is_available) throw new Error(`"${p.name}" está indisponível`);

  let unit_price = Number(p.promotional_price ?? p.price ?? 0);
  let sku = p.sku as string | null;
  let stock = p.stock_quantity as number | null;
  let variant_label: string | null = null;
  let units_per_pack = 1;
  const sells_by_kit = !!p.sells_by_kit;

  if (sells_by_kit && !variant_id) {
    throw new Error(`"${p.name}" só é vendido em kits fechados — selecione uma opção.`);
  }

  if (variant_id) {
    const { data: v } = await supabase
      .from("product_variants")
      .select(
        "id, sku, name, price, promotional_price, stock_quantity, option1_name, option1_value, option2_name, option2_value, units_per_pack, is_kit, is_active, stock_mode, weight_kg, width_mm, height_mm, length_mm",
      )
      .eq("id", variant_id)
      .eq("product_id", product_id)
      .maybeSingle();
    if (!v) throw new Error("Variação indisponível");
    if (sells_by_kit && (!v.is_kit || v.is_active === false)) {
      throw new Error("Opção de kit indisponível");
    }
    unit_price = Number(v.promotional_price ?? v.price ?? unit_price ?? 0);
    sku = v.sku ?? sku;
    units_per_pack = Math.max(1, Number(v.units_per_pack ?? 1));

    if (v.is_kit) {
      // Estoque em CAIXAS
      const mode: "own" | "derived" = v.stock_mode === "derived" ? "derived" : "own";
      stock =
        mode === "derived"
          ? p.stock_quantity != null
            ? Math.floor(Number(p.stock_quantity) / units_per_pack)
            : null
          : v.stock_quantity != null
            ? Number(v.stock_quantity)
            : null;
      variant_label = v.name ?? `Caixa com ${units_per_pack}`;
    } else {
      stock = v.stock_quantity ?? stock;
      variant_label =
        [
          v.option1_name && v.option1_value ? `${v.option1_name}: ${v.option1_value}` : null,
          v.option2_name && v.option2_value ? `${v.option2_name}: ${v.option2_value}` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null;
    }
  }

  if (unit_price <= 0) throw new Error(`"${p.name}" está sem preço configurado`);
  return { product: p, unit_price, sku, stock, variant_label, units_per_pack, sells_by_kit };
}


// ---------- READ ----------
export const getMyCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CartSnapshot> => {
    const { data: cart } = await context.supabase
      .from("carts")
      .select("id, currency")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();

    if (!cart) {
      return { cart_id: null, currency: "BRL", items: [], subtotal: 0, item_count: 0 };
    }

    const { data: rows } = await context.supabase
      .from("cart_items")
      .select("id, product_id, variant_id, quantity, unit_price, metadata, created_at")
      .eq("cart_id", cart.id)
      .order("created_at", { ascending: true });

    const items = rows ?? [];
    const productIds = Array.from(new Set(items.map((r: any) => r.product_id)));
    const variantIds = Array.from(
      new Set(items.map((r: any) => r.variant_id).filter(Boolean) as string[]),
    );

    const [{ data: prods }, { data: imgs }, { data: variants }] = await Promise.all([
      context.supabase
        .from("products")
        .select("id, name, slug, sku, stock_quantity, sells_by_kit")
        .in("id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"]),
      context.supabase
        .from("product_images")
        .select("product_id, storage_path, source_url, is_main, position")
        .in("product_id", productIds.length ? productIds : ["00000000-0000-0000-0000-000000000000"])
        .order("is_main", { ascending: false })
        .order("position", { ascending: true }),
      variantIds.length
        ? context.supabase
            .from("product_variants")
            .select(
              "id, sku, name, stock_quantity, option1_name, option1_value, option2_name, option2_value, units_per_pack, is_kit, stock_mode",
            )
            .in("id", variantIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
    const productMap = new Map<string, any>((prods ?? []).map((p: any) => [p.id, p]));
    const imgMap = new Map<string, string | null>();
    for (const img of imgs ?? []) {
      if (!imgMap.has(img.product_id)) {
        imgMap.set(img.product_id, publicUrl(base, img.storage_path) ?? img.source_url ?? null);
      }
    }
    const variantMap = new Map<string, any>((variants ?? []).map((v: any) => [v.id, v]));

    const lines: CartLine[] = items.map((r: any) => {
      const p = productMap.get(r.product_id);
      const v = r.variant_id ? variantMap.get(r.variant_id) : null;
      const isKit = !!v?.is_kit;
      const units_per_pack = isKit ? Math.max(1, Number(v?.units_per_pack ?? 1)) : 1;
      const variant_label = v
        ? isKit
          ? (v.name ?? `Caixa com ${units_per_pack}`)
          : [
              v.option1_name && v.option1_value ? `${v.option1_name}: ${v.option1_value}` : null,
              v.option2_name && v.option2_value ? `${v.option2_name}: ${v.option2_value}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
        : null;
      const unit = Number(r.unit_price);
      // Max stock em CAIXAS (kit) ou UNIDADES (avulso)
      let maxStock: number | null = v?.stock_quantity ?? p?.stock_quantity ?? null;
      if (isKit) {
        const mode: "own" | "derived" = v?.stock_mode === "derived" ? "derived" : "own";
        maxStock =
          mode === "derived"
            ? p?.stock_quantity != null
              ? Math.floor(Number(p.stock_quantity) / units_per_pack)
              : null
            : v?.stock_quantity != null
              ? Number(v.stock_quantity)
              : null;
      }
      return {
        item_id: r.id,
        product_id: r.product_id,
        variant_id: r.variant_id,
        product_name: p?.name ?? "Produto",
        product_slug: p?.slug ?? "",
        variant_label,
        sku: v?.sku ?? p?.sku ?? null,
        unit_price: unit,
        quantity: r.quantity,
        line_total: Number((unit * r.quantity).toFixed(2)),
        image_url: imgMap.get(r.product_id) ?? null,
        max_stock: maxStock,
        units_per_pack,
        sells_by_kit: !!p?.sells_by_kit,
      };
    });


    const subtotal = Number(lines.reduce((s, l) => s + l.line_total, 0).toFixed(2));
    const item_count = lines.reduce((s, l) => s + l.quantity, 0);

    return { cart_id: cart.id, currency: cart.currency, items: lines, subtotal, item_count };
  });

// ---------- ADD ----------
export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().nullable().optional(),
        quantity: z.number().int().min(1).max(9999).default(1),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const variant_id = data.variant_id ?? null;
    const resolved = await resolveLineData(context.supabase, data.product_id, variant_id);
    const cartId = await ensureCart(context.supabase, context.userId);

    // Look up existing line for this (product, variant) pair
    let row: { id: string; quantity: number } | null = null;
    if (variant_id === null) {
      const { data: match } = await context.supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", cartId)
        .eq("product_id", data.product_id)
        .is("variant_id", null)
        .maybeSingle();
      row = match ?? null;
    } else {
      const { data: match } = await context.supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("cart_id", cartId)
        .eq("product_id", data.product_id)
        .eq("variant_id", variant_id)
        .maybeSingle();
      row = match ?? null;
    }

    const nextQty = (row?.quantity ?? 0) + data.quantity;
    if (resolved.stock != null && nextQty > resolved.stock) {
      throw new Error(`Estoque insuficiente. Disponível: ${resolved.stock}`);
    }

    if (row) {
      const { error } = await context.supabase
        .from("cart_items")
        .update({ quantity: nextQty, unit_price: resolved.unit_price })
        .eq("id", row.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("cart_items").insert({
        cart_id: cartId,
        product_id: data.product_id,
        variant_id,
        quantity: data.quantity,
        unit_price: resolved.unit_price,
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

// ---------- UPDATE QUANTITY ----------
export const updateCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ item_id: z.string().uuid(), quantity: z.number().int().min(0).max(9999) }).parse(data),
  )
  .handler(async ({ context, data }) => {
    // Verify ownership via cart join
    const { data: row } = await context.supabase
      .from("cart_items")
      .select("id, product_id, variant_id, cart:carts!inner(user_id)")
      .eq("id", data.item_id)
      .maybeSingle();
    if (!row || (row as any).cart?.user_id !== context.userId) {
      throw new Error("Item não encontrado");
    }

    if (data.quantity === 0) {
      const { error } = await context.supabase.from("cart_items").delete().eq("id", data.item_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const resolved = await resolveLineData(context.supabase, row.product_id, row.variant_id);
    if (resolved.stock != null && data.quantity > resolved.stock) {
      throw new Error(`Estoque insuficiente. Disponível: ${resolved.stock}`);
    }
    const { error } = await context.supabase
      .from("cart_items")
      .update({ quantity: data.quantity, unit_price: resolved.unit_price })
      .eq("id", data.item_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- REMOVE ----------
export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ item_id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: row } = await context.supabase
      .from("cart_items")
      .select("id, cart:carts!inner(user_id)")
      .eq("id", data.item_id)
      .maybeSingle();
    if (!row || (row as any).cart?.user_id !== context.userId) {
      throw new Error("Item não encontrado");
    }
    const { error } = await context.supabase.from("cart_items").delete().eq("id", data.item_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- MERGE ANONYMOUS ----------
export const mergeAnonymousCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              product_id: z.string().uuid(),
              variant_id: z.string().uuid().nullable().optional(),
              quantity: z.number().int().min(1).max(9999),
            }),
          )
          .max(200),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    if (data.items.length === 0) return { merged: 0 };
    const cartId = await ensureCart(context.supabase, context.userId);
    let merged = 0;
    for (const item of data.items) {
      const variant_id = item.variant_id ?? null;
      try {
        const resolved = await resolveLineData(context.supabase, item.product_id, variant_id);

        let existing: { id: string; quantity: number } | null = null;
        if (variant_id === null) {
          const { data: match } = await context.supabase
            .from("cart_items")
            .select("id, quantity")
            .eq("cart_id", cartId)
            .eq("product_id", item.product_id)
            .is("variant_id", null)
            .maybeSingle();
          existing = match ?? null;
        } else {
          const { data: match } = await context.supabase
            .from("cart_items")
            .select("id, quantity")
            .eq("cart_id", cartId)
            .eq("product_id", item.product_id)
            .eq("variant_id", variant_id)
            .maybeSingle();
          existing = match ?? null;
        }

        let nextQty = (existing?.quantity ?? 0) + item.quantity;
        if (resolved.stock != null) nextQty = Math.min(nextQty, resolved.stock);
        if (nextQty <= 0) continue;

        if (existing) {
          await context.supabase
            .from("cart_items")
            .update({ quantity: nextQty, unit_price: resolved.unit_price })
            .eq("id", existing.id);
        } else {
          await context.supabase.from("cart_items").insert({
            cart_id: cartId,
            product_id: item.product_id,
            variant_id,
            quantity: nextQty,
            unit_price: resolved.unit_price,
          });
        }
        merged += 1;
      } catch {
        // Skip broken items silently — user will see the final cart contents
      }
    }
    return { merged };
  });

// ---------- PUBLIC HYDRATE (anonymous carts) ----------
export const hydrateAnonymousCart = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        items: z
          .array(
            z.object({
              product_id: z.string().uuid(),
              variant_id: z.string().uuid().nullable().optional(),
              quantity: z.number().int().min(1).max(9999),
            }),
          )
          .max(200),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<CartSnapshot> => {
    if (data.items.length === 0) {
      return { cart_id: null, currency: "BRL", items: [], subtotal: 0, item_count: 0 };
    }
    const { supabaseAdmin: supabase } = await import("@/integrations/supabase/client.server");
    const productIds = Array.from(new Set(data.items.map((i) => i.product_id)));
    const variantIds = Array.from(
      new Set(data.items.map((i) => i.variant_id).filter(Boolean) as string[]),
    );

    const [{ data: prods }, { data: imgs }, { data: variants }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, sku, price, promotional_price, stock_quantity, sells_by_kit")
        .in("id", productIds),
      supabase
        .from("product_images")
        .select("product_id, storage_path, source_url, is_main, position")
        .in("product_id", productIds)
        .order("is_main", { ascending: false })
        .order("position", { ascending: true }),
      variantIds.length
        ? supabase
            .from("product_variants")
            .select(
              "id, sku, name, price, promotional_price, stock_quantity, option1_name, option1_value, option2_name, option2_value, units_per_pack, is_kit, stock_mode",
            )
            .in("id", variantIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
    const productMap = new Map<string, any>((prods ?? []).map((p: any) => [p.id, p]));
    const imgMap = new Map<string, string | null>();
    for (const img of imgs ?? []) {
      if (!imgMap.has(img.product_id)) {
        imgMap.set(img.product_id, publicUrl(base, img.storage_path) ?? img.source_url ?? null);
      }
    }
    const variantMap = new Map<string, any>((variants ?? []).map((v: any) => [v.id, v]));

    const lines: CartLine[] = data.items.map((i, idx) => {
      const p = productMap.get(i.product_id);
      const v = i.variant_id ? variantMap.get(i.variant_id) : null;
      const isKit = !!v?.is_kit;
      const units_per_pack = isKit ? Math.max(1, Number(v?.units_per_pack ?? 1)) : 1;
      const variant_label = v
        ? isKit
          ? (v.name ?? `Caixa com ${units_per_pack}`)
          : [
              v.option1_name && v.option1_value ? `${v.option1_name}: ${v.option1_value}` : null,
              v.option2_name && v.option2_value ? `${v.option2_name}: ${v.option2_value}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
        : null;
      const unit = Number(
        v?.promotional_price ?? v?.price ?? p?.promotional_price ?? p?.price ?? 0,
      );
      let maxStock: number | null = v?.stock_quantity ?? p?.stock_quantity ?? null;
      if (isKit) {
        const mode: "own" | "derived" = v?.stock_mode === "derived" ? "derived" : "own";
        maxStock =
          mode === "derived"
            ? p?.stock_quantity != null
              ? Math.floor(Number(p.stock_quantity) / units_per_pack)
              : null
            : v?.stock_quantity != null
              ? Number(v.stock_quantity)
              : null;
      }
      return {
        item_id: `local-${idx}-${i.product_id}-${i.variant_id ?? "0"}`,
        product_id: i.product_id,
        variant_id: i.variant_id ?? null,
        product_name: p?.name ?? "Produto",
        product_slug: p?.slug ?? "",
        variant_label,
        sku: v?.sku ?? p?.sku ?? null,
        unit_price: unit,
        quantity: i.quantity,
        line_total: Number((unit * i.quantity).toFixed(2)),
        image_url: imgMap.get(i.product_id) ?? null,
        max_stock: maxStock,
        units_per_pack,
        sells_by_kit: !!p?.sells_by_kit,
      };
    });


    const subtotal = Number(lines.reduce((s, l) => s + l.line_total, 0).toFixed(2));
    const item_count = lines.reduce((s, l) => s + l.quantity, 0);
    return { cart_id: null, currency: "BRL", items: lines, subtotal, item_count };
  });

// ---------- RESTORE CART FROM A PENDING ORDER ----------
/**
 * Reabre o carrinho ativo do usuário com os itens de um pedido que ficou
 * "aguardando_pagamento" (ex.: pagamento recusado ou retorno sem confirmação).
 * O pedido permanece registrado com o status atual — apenas espelhamos os
 * itens no carrinho para o cliente poder tentar novamente sem perder nada.
 */
export const restoreCartFromOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ order_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, status, user_id")
      .eq("id", data.order_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status === "pago" || order.status === "enviado" || order.status === "entregue") {
      return { restored: 0, skipped: "order_already_paid" as const };
    }

    const { data: items } = await context.supabase
      .from("order_items")
      .select("product_id, variant_id, quantity")
      .eq("order_id", order.id);
    const rows = items ?? [];
    if (rows.length === 0) return { restored: 0 };

    const cartId = await ensureCart(context.supabase, context.userId);
    let restored = 0;
    for (const it of rows) {
      const variant_id = (it.variant_id as string | null) ?? null;
      try {
        const resolved = await resolveLineData(
          context.supabase,
          it.product_id as string,
          variant_id,
        );
        let existing: { id: string; quantity: number } | null = null;
        if (variant_id === null) {
          const { data: match } = await context.supabase
            .from("cart_items")
            .select("id, quantity")
            .eq("cart_id", cartId)
            .eq("product_id", it.product_id)
            .is("variant_id", null)
            .maybeSingle();
          existing = match ?? null;
        } else {
          const { data: match } = await context.supabase
            .from("cart_items")
            .select("id, quantity")
            .eq("cart_id", cartId)
            .eq("product_id", it.product_id)
            .eq("variant_id", variant_id)
            .maybeSingle();
          existing = match ?? null;
        }

        let nextQty = Math.max(Number(it.quantity) || 0, existing?.quantity ?? 0);
        if (resolved.stock != null) nextQty = Math.min(nextQty, resolved.stock);
        if (nextQty <= 0) continue;

        if (existing) {
          await context.supabase
            .from("cart_items")
            .update({ quantity: nextQty, unit_price: resolved.unit_price })
            .eq("id", existing.id);
        } else {
          await context.supabase.from("cart_items").insert({
            cart_id: cartId,
            product_id: it.product_id,
            variant_id,
            quantity: nextQty,
            unit_price: resolved.unit_price,
          });
        }
        restored += 1;
      } catch {
        // Item indisponível: apenas ignora
      }
    }
    return { restored };
  });
