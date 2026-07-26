import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  BundleOffer,
  BundleOfferItem,
  BundleDiscountType,
  BundleVariantScope,
} from "./bundles.shared";

const BUCKET = "catalog-media";

function publicUrl(base: string, path: string | null): string | null {
  if (!path) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path.replace(/^\/+/, "")}`;
}

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", {
    _user_id: context.userId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

/**
 * Enriquece uma lista de ofertas com dados de exibição (nome, imagem,
 * preço unitário) para cada item participante.
 */
async function hydrateOffers(
  supabase: any,
  offers: any[],
  itemsByOffer: Map<string, any[]>,
): Promise<BundleOffer[]> {
  const allItems = offers.flatMap((o) => itemsByOffer.get(o.id) ?? []);
  const productIds = Array.from(new Set(allItems.map((i: any) => i.product_id)));
  const variantIds = Array.from(
    new Set(allItems.map((i: any) => i.variant_id).filter(Boolean) as string[]),
  );
  if (productIds.length === 0) return [];

  const [{ data: prods }, { data: imgs }, { data: variants }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, slug, price, promotional_price"),
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
            "id, name, price, promotional_price, units_per_pack, is_kit, option1_name, option1_value, option2_name, option2_value",
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

  return offers.map((o) => {
    const items: BundleOfferItem[] = (itemsByOffer.get(o.id) ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i: any) => {
        const p = productMap.get(i.product_id);
        const v = i.variant_id ? variantMap.get(i.variant_id) : null;
        const unit_price = Number(
          v?.promotional_price ??
            v?.price ??
            p?.promotional_price ??
            p?.price ??
            0,
        );
        const variant_label = v
          ? v.is_kit
            ? (v.name ?? `Caixa com ${v.units_per_pack ?? "?"}`)
            : [
                v.option1_name && v.option1_value ? `${v.option1_name}: ${v.option1_value}` : null,
                v.option2_name && v.option2_value ? `${v.option2_name}: ${v.option2_value}` : null,
              ]
                .filter(Boolean)
                .join(" · ") || null
          : null;
        return {
          id: i.id,
          offer_id: i.offer_id,
          product_id: i.product_id,
          variant_id: i.variant_id,
          variant_scope: i.variant_scope as BundleVariantScope,
          quantity: Number(i.quantity),
          is_anchor: !!i.is_anchor,
          is_complement_target: !!i.is_complement_target,
          sort_order: Number(i.sort_order ?? 0),
          product_name: p?.name ?? "Produto",
          product_slug: p?.slug ?? "",
          variant_label,
          unit_price,
          image_url: imgMap.get(i.product_id) ?? null,
        };
      });
    return {
      id: o.id,
      product_id: o.product_id,
      name: o.name,
      discount_type: o.discount_type as BundleDiscountType,
      discount_value: Number(o.discount_value),
      allow_stack_with_coupon: !!o.allow_stack_with_coupon,
      starts_at: o.starts_at ?? null,
      ends_at: o.ends_at ?? null,
      is_active: !!o.is_active,
      sort_order: Number(o.sort_order ?? 0),
      items,
    };
  });
}

/** Carrega ofertas ativas ancoradas em um produto (para a página do produto). */
export const listBundleOffersForProduct = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ data }): Promise<BundleOffer[]> => {
    const { supabaseAdmin: supabase } = await import(
      "@/integrations/supabase/client.server"
    );
    const nowIso = new Date().toISOString();
    const { data: offers } = await supabase
      .from("bundle_offers")
      .select(
        "id, product_id, name, discount_type, discount_value, allow_stack_with_coupon, starts_at, ends_at, is_active, sort_order",
      )
      .eq("product_id", data.productId)
      .eq("is_active", true)
      .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
      .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
      .order("sort_order", { ascending: true });

    if (!offers || offers.length === 0) return [];
    const offerIds = offers.map((o: any) => o.id);
    const { data: items } = await supabase
      .from("bundle_offer_items")
      .select(
        "id, offer_id, product_id, variant_id, variant_scope, quantity, is_anchor, is_complement_target, sort_order",
      )
      .in("offer_id", offerIds);

    const map = new Map<string, any[]>();
    for (const it of items ?? []) {
      const arr = map.get(it.offer_id) ?? [];
      arr.push(it);
      map.set(it.offer_id, arr);
    }
    return hydrateOffers(supabase, offers, map);
  });

/** Carrega TODAS as ofertas ativas cujas linhas mencionem algum dos productIds do carrinho. */
export async function loadActiveOffersMatchingProducts(
  productIds: string[],
): Promise<BundleOffer[]> {
  if (productIds.length === 0) return [];
  const { supabaseAdmin: supabase } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data: items } = await supabase
    .from("bundle_offer_items")
    .select("offer_id")
    .in("product_id", productIds);
  const offerIds = Array.from(new Set((items ?? []).map((i: any) => i.offer_id)));
  if (offerIds.length === 0) return [];

  const nowIso = new Date().toISOString();
  const { data: offers } = await supabase
    .from("bundle_offers")
    .select(
      "id, product_id, name, discount_type, discount_value, allow_stack_with_coupon, starts_at, ends_at, is_active, sort_order",
    )
    .in("id", offerIds)
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order("sort_order", { ascending: true });

  if (!offers || offers.length === 0) return [];
  const { data: allItems } = await supabase
    .from("bundle_offer_items")
    .select(
      "id, offer_id, product_id, variant_id, variant_scope, quantity, is_anchor, is_complement_target, sort_order",
    )
    .in("offer_id", offers.map((o: any) => o.id));
  const map = new Map<string, any[]>();
  for (const it of allItems ?? []) {
    const arr = map.get(it.offer_id) ?? [];
    arr.push(it);
    map.set(it.offer_id, arr);
  }
  return hydrateOffers(supabase, offers, map);
}

// ---------- ADD BUNDLE TO CART ----------
export const addBundleToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        offer_id: z.string().uuid(),
        selections: z
          .array(
            z.object({
              offer_item_id: z.string().uuid(),
              product_id: z.string().uuid(),
              variant_id: z.string().uuid().nullable().optional(),
            }),
          )
          .max(20),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    // Carrega oferta + itens
    const [{ data: offer }, { data: offerItems }] = await Promise.all([
      context.supabase
        .from("bundle_offers")
        .select(
          "id, product_id, name, discount_type, discount_value, is_active, starts_at, ends_at",
        )
        .eq("id", data.offer_id)
        .maybeSingle(),
      context.supabase
        .from("bundle_offer_items")
        .select(
          "id, product_id, variant_id, variant_scope, quantity, is_anchor, is_complement_target",
        )
        .eq("offer_id", data.offer_id),
    ]);
    if (!offer || !offer.is_active) throw new Error("Oferta indisponível");
    if (offer.starts_at && new Date(offer.starts_at).getTime() > Date.now())
      throw new Error("Oferta ainda não iniciou");
    if (offer.ends_at && new Date(offer.ends_at).getTime() < Date.now())
      throw new Error("Oferta expirada");
    const items = offerItems ?? [];
    if (items.length === 0) throw new Error("Oferta sem itens");

    // Garante o carrinho
    let cartId: string;
    const { data: existing } = await context.supabase
      .from("carts")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (existing?.id) {
      cartId = existing.id;
    } else {
      const { data: created, error } = await context.supabase
        .from("carts")
        .insert({ user_id: context.userId, status: "active" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      cartId = created.id;
    }

    // Resolve variação para cada item (respeitando seleção do usuário)
    const selMap = new Map(data.selections.map((s) => [s.offer_item_id, s]));
    type Resolved = {
      offer_item_id: string;
      product_id: string;
      variant_id: string | null;
      quantity: number;
      is_anchor: boolean;
      is_complement_target: boolean;
    };
    const resolved: Resolved[] = items.map((it: any) => {
      const sel = selMap.get(it.id);
      let variant_id: string | null = it.variant_id;
      if (it.variant_scope !== "specific") {
        if (!sel || sel.product_id !== it.product_id) {
          throw new Error(`Selecione a variação obrigatória para "${it.product_id}"`);
        }
        variant_id = sel.variant_id ?? null;
      }
      return {
        offer_item_id: it.id,
        product_id: it.product_id,
        variant_id,
        quantity: Number(it.quantity),
        is_anchor: !!it.is_anchor,
        is_complement_target: !!it.is_complement_target,
      };
    });

    // Valida estoque + preço de todos ANTES de gravar (falha atômica)
    type Prepared = Resolved & { unit_price: number };
    const prepared: Prepared[] = [];
    for (const r of resolved) {
      const { data: p } = await context.supabase
        .from("products")
        .select(
          "id, name, price, promotional_price, is_available, stock_quantity, sells_by_kit",
        )
        .eq("id", r.product_id)
        .maybeSingle();
      if (!p) throw new Error("Produto do conjunto não encontrado");
      if (!p.is_available) throw new Error(`"${p.name}" está indisponível`);
      let unit_price = Number(p.promotional_price ?? p.price ?? 0);
      let stock: number | null = p.stock_quantity;
      if (r.variant_id) {
        const { data: v } = await context.supabase
          .from("product_variants")
          .select(
            "id, price, promotional_price, stock_quantity, units_per_pack, is_kit, is_active, stock_mode",
          )
          .eq("id", r.variant_id)
          .eq("product_id", r.product_id)
          .maybeSingle();
        if (!v || v.is_active === false)
          throw new Error("Variação do conjunto indisponível");
        unit_price = Number(v.promotional_price ?? v.price ?? unit_price ?? 0);
        if (v.is_kit) {
          const units = Math.max(1, Number(v.units_per_pack ?? 1));
          stock =
            v.stock_mode === "derived"
              ? p.stock_quantity != null
                ? Math.floor(Number(p.stock_quantity) / units)
                : null
              : v.stock_quantity != null
                ? Number(v.stock_quantity)
                : null;
        } else {
          stock = v.stock_quantity ?? stock;
        }
      } else if (p.sells_by_kit) {
        throw new Error(`"${p.name}" só é vendido em kits — selecione uma opção.`);
      }
      if (unit_price <= 0) throw new Error(`"${p.name}" sem preço configurado`);

      // Já no carrinho?
      let existingQty = 0;
      if (r.variant_id === null) {
        const { data: match } = await context.supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", cartId)
          .eq("product_id", r.product_id)
          .is("variant_id", null)
          .maybeSingle();
        existingQty = match?.quantity ?? 0;
      } else {
        const { data: match } = await context.supabase
          .from("cart_items")
          .select("id, quantity")
          .eq("cart_id", cartId)
          .eq("product_id", r.product_id)
          .eq("variant_id", r.variant_id)
          .maybeSingle();
        existingQty = match?.quantity ?? 0;
      }
      if (stock != null && existingQty + r.quantity > stock) {
        throw new Error(
          `Estoque insuficiente para "${p.name}" — disponível: ${Math.max(0, stock - existingQty)}`,
        );
      }
      prepared.push({ ...r, unit_price });
    }

    // Insere/atualiza cada linha
    for (const r of prepared) {
      const meta = {
        bundle: {
          offer_id: offer.id,
          role: r.is_anchor
            ? "anchor"
            : r.is_complement_target
              ? "complement"
              : "item",
        },
      };
      let row: { id: string; quantity: number; metadata: any } | null = null;
      if (r.variant_id === null) {
        const { data: match } = await context.supabase
          .from("cart_items")
          .select("id, quantity, metadata")
          .eq("cart_id", cartId)
          .eq("product_id", r.product_id)
          .is("variant_id", null)
          .maybeSingle();
        row = match ?? null;
      } else {
        const { data: match } = await context.supabase
          .from("cart_items")
          .select("id, quantity, metadata")
          .eq("cart_id", cartId)
          .eq("product_id", r.product_id)
          .eq("variant_id", r.variant_id)
          .maybeSingle();
        row = match ?? null;
      }
      if (row) {
        const mergedMeta = { ...(row.metadata ?? {}), ...meta };
        const { error } = await context.supabase
          .from("cart_items")
          .update({
            quantity: row.quantity + r.quantity,
            unit_price: r.unit_price,
            metadata: mergedMeta,
          })
          .eq("id", row.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await context.supabase.from("cart_items").insert({
          cart_id: cartId,
          product_id: r.product_id,
          variant_id: r.variant_id,
          quantity: r.quantity,
          unit_price: r.unit_price,
          metadata: meta,
        });
        if (error) throw new Error(error.message);
      }
    }

    // Telemetria (best-effort)
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cur } = await supabaseAdmin
        .from("bundle_offers")
        .select("add_to_cart_count")
        .eq("id", offer.id)
        .maybeSingle();
      const next = Number((cur as any)?.add_to_cart_count ?? 0) + 1;
      await supabaseAdmin
        .from("bundle_offers")
        .update({ add_to_cart_count: next })
        .eq("id", offer.id);
    } catch {}

    return { ok: true, offer_id: offer.id };
  });

// ---------- IMPRESSION TELEMETRY ----------
export const recordBundleImpression = createServerFn({ method: "POST" })
  .inputValidator((v) => z.object({ offer_id: z.string().uuid() }).parse(v))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: cur } = await supabaseAdmin
        .from("bundle_offers")
        .select("impressions")
        .eq("id", data.offer_id)
        .maybeSingle();
      const next = Number((cur as any)?.impressions ?? 0) + 1;
      await supabaseAdmin
        .from("bundle_offers")
        .update({ impressions: next })
        .eq("id", data.offer_id);
    } catch {}
    return { ok: true };
  });

// ============================================================================
// ADMIN
// ============================================================================

export const adminListBundleOffers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }): Promise<BundleOffer[]> => {
    await assertStaff(context);
    const { data: offers } = await context.supabase
      .from("bundle_offers")
      .select(
        "id, product_id, name, discount_type, discount_value, allow_stack_with_coupon, starts_at, ends_at, is_active, sort_order, impressions, add_to_cart_count, conversions, revenue_total, discount_total",
      )
      .eq("product_id", data.productId)
      .order("sort_order", { ascending: true });
    if (!offers || offers.length === 0) return [];
    const { data: items } = await context.supabase
      .from("bundle_offer_items")
      .select(
        "id, offer_id, product_id, variant_id, variant_scope, quantity, is_anchor, is_complement_target, sort_order",
      )
      .in(
        "offer_id",
        offers.map((o: any) => o.id),
      );
    const map = new Map<string, any[]>();
    for (const it of items ?? []) {
      const arr = map.get(it.offer_id) ?? [];
      arr.push(it);
      map.set(it.offer_id, arr);
    }
    return hydrateOffers(context.supabase, offers, map);
  });

export const adminSearchProductsForBundle = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ query: z.string().min(1).max(120) }).parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const q = `%${data.query}%`;
    const { data: prods } = await context.supabase
      .from("products")
      .select("id, name, slug, sku, sells_by_kit, price, promotional_price")
      .or(`name.ilike.${q},sku.ilike.${q}`)
      .limit(20);
    const ids = (prods ?? []).map((p: any) => p.id);
    let variantsByProduct = new Map<string, any[]>();
    if (ids.length) {
      const { data: variants } = await context.supabase
        .from("product_variants")
        .select(
          "id, product_id, name, sku, is_kit, is_active, units_per_pack, option1_name, option1_value, option2_name, option2_value, price, promotional_price",
        )
        .in("product_id", ids)
        .eq("is_active", true);
      for (const v of variants ?? []) {
        const arr = variantsByProduct.get(v.product_id) ?? [];
        arr.push(v);
        variantsByProduct.set(v.product_id, arr);
      }
    }
    return {
      products: (prods ?? []).map((p: any) => ({
        ...p,
        variants: variantsByProduct.get(p.id) ?? [],
      })),
    };
  });

const upsertOfferInput = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  name: z.string().min(1).max(160),
  discount_type: z.enum([
    "percent",
    "fixed",
    "fixed_price",
    "complement_percent",
    "complement_fixed",
  ]),
  discount_value: z.number().min(0).max(1_000_000),
  allow_stack_with_coupon: z.boolean().default(false),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().min(0).max(9999).default(0),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().nullable().optional(),
        variant_scope: z.enum(["any", "specific", "any_kit"]).default("any"),
        quantity: z.number().int().min(1).max(9999),
        is_anchor: z.boolean().default(false),
        is_complement_target: z.boolean().default(false),
        sort_order: z.number().int().min(0).max(9999).default(0),
      }),
    )
    .min(2)
    .max(10),
});

export const adminUpsertBundleOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => upsertOfferInput.parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const patch = {
      product_id: data.product_id,
      name: data.name,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      allow_stack_with_coupon: data.allow_stack_with_coupon,
      starts_at: data.starts_at ?? null,
      ends_at: data.ends_at ?? null,
      is_active: data.is_active,
      sort_order: data.sort_order,
    };
    let offerId = data.id;
    if (offerId) {
      const { error } = await context.supabase
        .from("bundle_offers")
        .update(patch)
        .eq("id", offerId);
      if (error) throw new Error(error.message);
      await context.supabase
        .from("bundle_offer_items")
        .delete()
        .eq("offer_id", offerId);
    } else {
      const { data: inserted, error } = await context.supabase
        .from("bundle_offers")
        .insert(patch)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      offerId = inserted.id;
    }
    const itemRows = data.items.map((it, idx) => ({
      offer_id: offerId,
      product_id: it.product_id,
      variant_id: it.variant_id ?? null,
      variant_scope: it.variant_scope,
      quantity: it.quantity,
      is_anchor: it.is_anchor,
      is_complement_target: it.is_complement_target,
      sort_order: it.sort_order ?? idx,
    }));
    const { error: itemsErr } = await context.supabase
      .from("bundle_offer_items")
      .insert(itemRows);
    if (itemsErr) throw new Error(itemsErr.message);
    return { ok: true, id: offerId };
  });

export const adminDeleteBundleOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("bundle_offers")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleBundleOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(v),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("bundle_offers")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
