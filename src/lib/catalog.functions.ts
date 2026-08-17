import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DEFAULT_MARKETPLACE_SETTINGS, mercadoLivreUrl, shopeeUrl } from "@/lib/marketplaces";

export type ShowcaseProduct = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  price: number | null;
  promotional_price: number | null;
  image_url: string | null;
  image_alt: string | null;
  badges: ProductBadge[];
};

export type ProductBadge = {
  key: string;
  label: string;
  color: string;
  priority: number;
};

export type CatalogCategory = {
  slug: string;
  name: string;
  count: number;
};

const BUCKET = "catalog-media";

function publicUrl(base: string, path: string | null): string | null {
  if (!path) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path.replace(/^\/+/, "")}`;
}

async function attachImages(prods: Array<{ id: string; name: string }>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const productIds = prods.map((p) => p.id);
  const map = new Map<string, { storage_path: string | null; source_url: string | null; alt_text: string | null }>();
  if (productIds.length === 0) return map;
  const { data: imgs } = await supabaseAdmin
    .from("product_images")
    .select("product_id, storage_path, source_url, alt_text, is_main, position")
    .in("product_id", productIds)
    .order("is_main", { ascending: false })
    .order("position", { ascending: true });
  for (const img of imgs ?? []) {
    if (!map.has(img.product_id)) {
      map.set(img.product_id, {
        storage_path: img.storage_path,
        source_url: img.source_url,
        alt_text: img.alt_text,
      });
    }
  }
  return map;
}

type BadgeSourceProduct = {
  id: string;
  price?: number | string | null;
  promotional_price?: number | string | null;
  stock_quantity?: number | null;
  published_at?: string | null;
};

/**
 * Resolve os selos de cada produto combinando atribuições manuais e regras
 * automáticas (estoque baixo, novidade, promoção vigente).
 */
async function attachBadges(
  prods: BadgeSourceProduct[],
): Promise<Map<string, ProductBadge[]>> {
  const out = new Map<string, ProductBadge[]>();
  if (prods.length === 0) return out;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const ids = prods.map((p) => p.id);

  const [{ data: badges }, { data: assignments }] = await Promise.all([
    supabaseAdmin
      .from("product_badges")
      .select("id, key, label, color, priority, auto_rule, rule_threshold, is_active")
      .eq("is_active", true)
      .order("priority", { ascending: true }),
    supabaseAdmin
      .from("product_badge_assignments")
      .select("product_id, badge_id, starts_at, ends_at")
      .in("product_id", ids),
  ]);

  const now = Date.now();
  const byId = new Map((badges ?? []).map((b: any) => [b.id, b]));
  const manual = new Map<string, Set<string>>();
  for (const a of assignments ?? []) {
    if (a.starts_at && new Date(a.starts_at).getTime() > now) continue;
    if (a.ends_at && new Date(a.ends_at).getTime() < now) continue;
    const set = manual.get(a.product_id) ?? new Set<string>();
    set.add(a.badge_id);
    manual.set(a.product_id, set);
  }

  for (const p of prods) {
    const picked: ProductBadge[] = [];
    const price = p.price != null ? Number(p.price) : null;
    const promo = p.promotional_price != null ? Number(p.promotional_price) : null;
    const stock = p.stock_quantity ?? null;
    const publishedAt = p.published_at ? new Date(p.published_at).getTime() : null;

    for (const b of (badges ?? []) as any[]) {
      const isManual = manual.get(p.id)?.has(b.id) ?? false;
      let auto = false;
      const threshold = b.rule_threshold != null ? Number(b.rule_threshold) : null;
      switch (b.auto_rule) {
        case "low_stock":
          auto = stock != null && stock > 0 && stock <= (threshold ?? 10);
          break;
        case "new_arrival":
          auto =
            publishedAt != null &&
            now - publishedAt <= (threshold ?? 30) * 24 * 60 * 60 * 1000;
          break;
        case "on_sale":
          auto = promo != null && price != null && promo > 0 && promo < price;
          break;
        default:
          auto = false;
      }
      if (isManual || auto) {
        picked.push({
          key: b.key,
          label: b.label,
          color: b.color,
          priority: Number(b.priority ?? 0),
        });
      }
    }
    picked.sort((a, b) => a.priority - b.priority);
    out.set(p.id, picked.slice(0, 3));
  }
  return out;
}

export const getShowcase = createServerFn({ method: "GET" })
  .inputValidator((v) =>
    z
      .object({
        categorySlug: z.string().min(1),
        limit: z.number().int().min(1).max(24).default(9),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id, name, slug")
      .eq("slug", data.categorySlug)
      .maybeSingle();
    if (!cat) return { category: null, products: [] as ShowcaseProduct[] };

    const { data: pcRows, error: pcErr } = await supabaseAdmin
      .from("product_categories")
      .select("product_id")
      .eq("category_id", cat.id);
    if (pcErr) throw new Error(pcErr.message);
    const ids = (pcRows ?? []).map((r) => r.product_id);
    if (ids.length === 0) return { category: cat, products: [] as ShowcaseProduct[] };

    const { data: prods, error } = await supabaseAdmin
      .from("products")
      .select("id, name, slug, short_description, price, promotional_price, stock_quantity, published_at")
      .in("id", ids)
      .in("status", ["enriched", "published"])
      .eq("is_available", true)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const imagesByProduct = await attachImages(prods ?? []);
    const badgesByProduct = await attachBadges((prods ?? []) as any);
    const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");

    const products: ShowcaseProduct[] = (prods ?? []).map((p) => {
      const img = imagesByProduct.get(p.id);
      const image_url = img ? publicUrl(base, img.storage_path) ?? img.source_url : null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        short_description: p.short_description,
        price: p.price !== null ? Number(p.price) : null,
        promotional_price: p.promotional_price !== null ? Number(p.promotional_price) : null,
        image_url,
        image_alt: img?.alt_text ?? p.name,
        badges: badgesByProduct.get(p.id) ?? [],
      };
    });

    return { category: cat, products };
  });

export const getCatalogCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prods, error } = await supabaseAdmin
    .from("products")
    .select("id")
    .in("status", ["enriched", "published"])
    .eq("is_available", true);
  if (error) throw new Error(error.message);
  const ids = (prods ?? []).map((p) => p.id);
  if (ids.length === 0) return { categories: [] as CatalogCategory[] };

  const { data: pcRows, error: pcErr } = await supabaseAdmin
    .from("product_categories")
    .select("product_id, category_id")
    .in("product_id", ids);
  if (pcErr) throw new Error(pcErr.message);

  const catIds = Array.from(new Set((pcRows ?? []).map((r) => r.category_id)));
  const { data: cats, error: cErr } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug")
    .in("id", catIds);
  if (cErr) throw new Error(cErr.message);

  const counts = new Map<string, number>();
  for (const r of pcRows ?? []) counts.set(r.category_id, (counts.get(r.category_id) ?? 0) + 1);
  const categories: CatalogCategory[] = (cats ?? [])
    .map((c) => ({ slug: c.slug, name: c.name, count: counts.get(c.id) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  return { categories };
});

/** Lista os selos ativos para uso como filtro na vitrine. */
export const getCatalogBadges = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("product_badges")
    .select("key, label, color, priority")
    .eq("is_active", true)
    .order("priority", { ascending: true });
  if (error) throw new Error(error.message);
  return { badges: (data ?? []).map((b) => ({ key: b.key, label: b.label, color: b.color, priority: Number(b.priority ?? 0) })) };
});

/**
 * Resolve os ids de produtos que possuem um determinado selo, combinando
 * atribuições manuais vigentes e a regra automática do selo.
 */
async function productIdsWithBadge(badgeKey: string): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: badge } = await supabaseAdmin
    .from("product_badges")
    .select("id, auto_rule, rule_threshold, is_active")
    .eq("key", badgeKey)
    .maybeSingle();
  if (!badge || !badge.is_active) return [];

  const ids = new Set<string>();
  const nowIso = new Date().toISOString();

  const { data: assignments } = await supabaseAdmin
    .from("product_badge_assignments")
    .select("product_id, starts_at, ends_at")
    .eq("badge_id", badge.id);
  const now = Date.now();
  for (const a of assignments ?? []) {
    if (a.starts_at && new Date(a.starts_at).getTime() > now) continue;
    if (a.ends_at && new Date(a.ends_at).getTime() < now) continue;
    ids.add(a.product_id);
  }

  const threshold = badge.rule_threshold != null ? Number(badge.rule_threshold) : null;
  if (badge.auto_rule === "low_stock") {
    const { data } = await supabaseAdmin
      .from("products")
      .select("id")
      .gt("stock_quantity", 0)
      .lte("stock_quantity", threshold ?? 10);
    for (const p of data ?? []) ids.add(p.id);
  } else if (badge.auto_rule === "new_arrival") {
    const since = new Date(now - (threshold ?? 30) * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabaseAdmin.from("products").select("id").gte("published_at", since);
    for (const p of data ?? []) ids.add(p.id);
  } else if (badge.auto_rule === "on_sale") {
    const { data } = await supabaseAdmin
      .from("products")
      .select("id, price, promotional_price")
      .not("promotional_price", "is", null);
    for (const p of data ?? []) {
      const price = p.price != null ? Number(p.price) : null;
      const promo = p.promotional_price != null ? Number(p.promotional_price) : null;
      if (promo && promo > 0 && price != null && promo < price) ids.add(p.id);
    }
  }
  void nowIso;
  return Array.from(ids);
}

export const listCatalog = createServerFn({ method: "GET" })
  .inputValidator((v) =>
    z
      .object({
        categorySlug: z.string().optional(),
        badge: z.string().optional(),
        freeShipping: z.boolean().optional(),
        onSale: z.boolean().optional(),
        availability: z.enum(["all", "in_stock"]).default("all"),
        sort: z.enum(["relevance", "newest", "price_asc", "price_desc", "name_asc"]).default("relevance"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(48).default(12),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const empty = { items: [] as ShowcaseProduct[], total: 0, page: data.page, pageSize: data.pageSize };

    let productIds: string[] | null = null;
    const intersect = (next: string[]) => {
      productIds = productIds === null ? next : productIds.filter((id) => next.includes(id));
    };

    if (data.categorySlug) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      if (!cat) return empty;
      const { data: pcRows, error: pcErr } = await supabaseAdmin
        .from("product_categories")
        .select("product_id")
        .eq("category_id", cat.id);
      if (pcErr) throw new Error(pcErr.message);
      intersect((pcRows ?? []).map((r) => r.product_id));
    }

    if (data.badge) intersect(await productIdsWithBadge(data.badge));
    if (data.freeShipping) intersect(await productIdsWithBadge("free_shipping"));

    if (productIds !== null && (productIds as string[]).length === 0) return empty;

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabaseAdmin
      .from("products")
      .select("id, name, slug, short_description, price, promotional_price, stock_quantity, published_at", { count: "exact" })
      .in("status", ["enriched", "published"])
      .eq("is_available", true);

    if (productIds) q = q.in("id", productIds);
    if (data.availability === "in_stock") q = q.gt("stock_quantity", 0);
    if (data.onSale) q = q.not("promotional_price", "is", null).gt("promotional_price", 0);

    if (data.sort === "newest") q = q.order("published_at", { ascending: false, nullsFirst: false });
    else if (data.sort === "price_asc") q = q.order("price", { ascending: true, nullsFirst: false });
    else if (data.sort === "price_desc") q = q.order("price", { ascending: false, nullsFirst: false });
    else if (data.sort === "name_asc") q = q.order("name", { ascending: true });
    else q = q.order("updated_at", { ascending: false });

    const { data: prods, error, count } = await q.range(from, to);
    if (error) throw new Error(error.message);

    const imagesByProduct = await attachImages(prods ?? []);
    const badgesByProduct = await attachBadges((prods ?? []) as any);
    const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");

    const items: ShowcaseProduct[] = (prods ?? []).map((p) => {
      const img = imagesByProduct.get(p.id);
      const image_url = img ? publicUrl(base, img.storage_path) ?? img.source_url : null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        short_description: p.short_description,
        price: p.price !== null ? Number(p.price) : null,
        promotional_price: p.promotional_price !== null ? Number(p.promotional_price) : null,
        image_url,
        image_alt: img?.alt_text ?? p.name,
        badges: badgesByProduct.get(p.id) ?? [],
      };
    });

    return { items, total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });


export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  model: string | null;
  reference: string | null;
  price: number | null;
  promotional_price: number | null;
  is_available: boolean;
  stock_quantity: number | null;
  short_description: string | null;
  commercial_description: string | null;
  technical_description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  images: Array<{ id: string; url: string; alt: string; is_main: boolean }>;
  categories: Array<{ name: string; slug: string }>;
  faqs: Array<{ id: string; question: string; answer: string }>;
  variants: ProductVariantOption[];
  variant_options: Array<{ name: string; values: string[] }>;
  sells_by_kit: boolean;
  kits: KitOption[];
  badges: ProductBadge[];
  /** Link para a loja oficial no Mercado Livre (busca pelo título) — null quando desativado. */
  mercado_livre_url: string | null;
  mercado_livre_label: string;
  /** Link para a loja oficial na Shopee (busca pelo título) — null quando desativado. */
  shopee_url: string | null;
  shopee_label: string;
};

export type ProductVariantOption = {
  id: string;
  name: string;
  sku: string | null;
  option1_name: string | null;
  option1_value: string | null;
  option2_name: string | null;
  option2_value: string | null;
  price: number | null;
  promotional_price: number | null;
  stock_quantity: number | null;
  image_url: string | null;
};

export type KitOption = {
  id: string;
  name: string;
  sku: string | null;
  units_per_pack: number;
  price: number | null;
  promotional_price: number | null;
  stock_mode: "own" | "derived";
  /** Estoque efetivo em caixas — já resolvido conforme stock_mode. */
  stock_boxes: number | null;
  weight_kg: number | null;
  width_mm: number | null;
  height_mm: number | null;
  length_mm: number | null;
  is_active: boolean;
  sort_order: number;
};

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ slug: z.string().min(1) }).parse(v))
  .handler(async ({ data }): Promise<ProductDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, slug, sku, model, reference, price, promotional_price, is_available, stock_quantity, short_description, commercial_description, technical_description, seo_title, seo_description, seo_keywords, sells_by_kit, status, published_at, ml_search_term, ml_url, ml_enabled, shopee_search_term, shopee_url, shopee_enabled",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!p) return null;

    const [{ data: imgs }, { data: faqs }, { data: cats }, { data: variantsRaw }] = await Promise.all([
      supabaseAdmin
        .from("product_images")
        .select("id, storage_path, source_url, alt_text, is_main, position")
        .eq("product_id", p.id)
        .order("is_main", { ascending: false })
        .order("position", { ascending: true }),
      supabaseAdmin
        .from("product_faqs")
        .select("id, question, answer, position")
        .eq("product_id", p.id)
        .order("position", { ascending: true }),
      supabaseAdmin
        .from("product_categories")
        .select("category:categories(name, slug)")
        .eq("product_id", p.id),
      supabaseAdmin
        .from("product_variants")
        .select(
          "id, name, sku, option1_name, option1_value, option2_name, option2_value, price, promotional_price, stock_quantity, main_image_url, sort_order, units_per_pack, is_kit, is_active, stock_mode, weight_kg, width_mm, height_mm, length_mm",
        )
        .eq("product_id", p.id)
        .order("sort_order", { ascending: true }),
    ]);

    const { data: mlRow } = await supabaseAdmin
      .from("marketplace_settings")
      .select(
        "ml_enabled, ml_store_slug, ml_search_url_template, ml_store_url, ml_button_label, shopee_enabled, shopee_store_slug, shopee_search_url_template, shopee_store_url, shopee_button_label",
      )
      .eq("id", "default")
      .maybeSingle();
    const mlSettings = { ...DEFAULT_MARKETPLACE_SETTINGS, ...(mlRow ?? {}) };

    const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
    const images = (imgs ?? [])
      .map((i) => {
        const url = publicUrl(base, i.storage_path) ?? i.source_url;
        return url ? { id: i.id, url, alt: i.alt_text ?? p.name, is_main: !!i.is_main } : null;
      })
      .filter((x): x is { id: string; url: string; alt: string; is_main: boolean } => !!x);

    const rawVariants = variantsRaw ?? [];
    const kitRows = rawVariants.filter((v: any) => v.is_kit && v.is_active !== false);
    const productStock = p.stock_quantity as number | null;

    const kits: KitOption[] = kitRows.map((v: any) => {
      const units = Math.max(1, Number(v.units_per_pack ?? 1));
      const mode: "own" | "derived" = v.stock_mode === "derived" ? "derived" : "own";
      const stock_boxes =
        mode === "derived"
          ? productStock != null
            ? Math.floor(productStock / units)
            : null
          : v.stock_quantity != null
            ? Number(v.stock_quantity)
            : null;
      return {
        id: v.id,
        name: v.name ?? (units === 1 ? "Unidade" : `Caixa com ${units}`),
        sku: v.sku,
        units_per_pack: units,
        price: v.price !== null ? Number(v.price) : null,
        promotional_price:
          v.promotional_price !== null && Number(v.promotional_price) > 0
            ? Number(v.promotional_price)
            : null,
        stock_mode: mode,
        stock_boxes,
        weight_kg: v.weight_kg !== null ? Number(v.weight_kg) : null,
        width_mm: v.width_mm !== null ? Number(v.width_mm) : null,
        height_mm: v.height_mm !== null ? Number(v.height_mm) : null,
        length_mm: v.length_mm !== null ? Number(v.length_mm) : null,
        is_active: v.is_active !== false,
        sort_order: Number(v.sort_order ?? 0),
      };
    });

    // Variantes clássicas (option1/option2) — só exibidas quando NÃO é venda por kit
    const nonKitVariants = rawVariants.filter((v: any) => !v.is_kit);
    const variants: ProductVariantOption[] = nonKitVariants.map((v: any) => ({
      id: v.id,
      name: v.name ?? p.name,
      sku: v.sku,
      option1_name: v.option1_name,
      option1_value: v.option1_value,
      option2_name: v.option2_name,
      option2_value: v.option2_value,
      price: v.price !== null ? Number(v.price) : null,
      promotional_price:
        v.promotional_price !== null && Number(v.promotional_price) > 0
          ? Number(v.promotional_price)
          : null,
      stock_quantity: v.stock_quantity,
      image_url: v.main_image_url,
    }));

    const optionMap = new Map<string, string[]>();
    for (const v of variants) {
      for (const [name, value] of [
        [v.option1_name, v.option1_value],
        [v.option2_name, v.option2_value],
      ] as const) {
        if (!name || !value) continue;
        const arr = optionMap.get(name) ?? [];
        if (!arr.includes(value)) arr.push(value);
        optionMap.set(name, arr);
      }
    }
    const variant_options = Array.from(optionMap.entries()).map(([name, values]) => ({
      name,
      values,
    }));

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      model: p.model,
      reference: p.reference,
      price: p.price !== null ? Number(p.price) : null,
      promotional_price: p.promotional_price !== null ? Number(p.promotional_price) : null,
      is_available: !!p.is_available,
      stock_quantity: p.stock_quantity,
      short_description: p.short_description,
      commercial_description: p.commercial_description,
      technical_description: p.technical_description,
      seo_title: p.seo_title,
      seo_description: p.seo_description,
      seo_keywords: p.seo_keywords ?? null,
      images,
      categories: (cats ?? [])
        .map((r: { category: { name: string; slug: string } | null }) => r.category)
        .filter((c): c is { name: string; slug: string } => !!c),
      faqs: (faqs ?? []).map((f) => ({ id: f.id, question: f.question, answer: f.answer })),
      variants,
      variant_options,
      sells_by_kit: !!p.sells_by_kit,
      kits,
      badges: (await attachBadges([p as any])).get(p.id) ?? [],
      mercado_livre_url: mercadoLivreUrl(p as any, mlSettings),
      mercado_livre_label: mlSettings.ml_button_label,
      shopee_url: shopeeUrl(p as any, mlSettings),
      shopee_label: mlSettings.shopee_button_label,
      shopee_alternatives: shopeeUrlVariants(p as any, mlSettings).slice(1),
    };
  });


