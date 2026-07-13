import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ShowcaseProduct = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  price: number | null;
  promotional_price: number | null;
  image_url: string | null;
  image_alt: string | null;
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
      .select("id, name, slug, short_description, price, promotional_price")
      .in("id", ids)
      .in("status", ["enriched", "published"])
      .eq("is_available", true)
      .order("updated_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);

    const imagesByProduct = await attachImages(prods ?? []);
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

export const listCatalog = createServerFn({ method: "GET" })
  .inputValidator((v) =>
    z
      .object({
        categorySlug: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(48).default(12),
      })
      .parse(v),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let productIds: string[] | null = null;
    if (data.categorySlug) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("id")
        .eq("slug", data.categorySlug)
        .maybeSingle();
      if (!cat) return { items: [] as ShowcaseProduct[], total: 0, page: data.page, pageSize: data.pageSize };
      const { data: pcRows, error: pcErr } = await supabaseAdmin
        .from("product_categories")
        .select("product_id")
        .eq("category_id", cat.id);
      if (pcErr) throw new Error(pcErr.message);
      productIds = (pcRows ?? []).map((r) => r.product_id);
      if (productIds.length === 0)
        return { items: [] as ShowcaseProduct[], total: 0, page: data.page, pageSize: data.pageSize };
    }

    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;

    let q = supabaseAdmin
      .from("products")
      .select("id, name, slug, short_description, price, promotional_price", { count: "exact" })
      .in("status", ["enriched", "published"])
      .eq("is_available", true)
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (productIds) q = q.in("id", productIds);

    const { data: prods, error, count } = await q;
    if (error) throw new Error(error.message);

    const imagesByProduct = await attachImages(prods ?? []);
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

export const getProductBySlug = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ slug: z.string().min(1) }).parse(v))
  .handler(async ({ data }): Promise<ProductDetail | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: p, error } = await supabaseAdmin
      .from("products")
      .select(
        "id, name, slug, sku, model, reference, price, promotional_price, is_available, stock_quantity, short_description, commercial_description, technical_description, seo_title, seo_description, seo_keywords, status",
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
        .select("id, name, sku, option1_name, option1_value, option2_name, option2_value, price, promotional_price, stock_quantity, main_image_url, sort_order")
        .eq("product_id", p.id)
        .order("sort_order", { ascending: true }),
    ]);

    const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
    const images = (imgs ?? [])
      .map((i) => {
        const url = publicUrl(base, i.storage_path) ?? i.source_url;
        return url ? { id: i.id, url, alt: i.alt_text ?? p.name, is_main: !!i.is_main } : null;
      })
      .filter((x): x is { id: string; url: string; alt: string; is_main: boolean } => !!x);

    const variants: ProductVariantOption[] = (variantsRaw ?? []).map((v) => ({
      id: v.id,
      name: v.name,
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

    // Build unique option groups (Cor, Tamanho, etc.) preserving first-seen order
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
    };
  });

