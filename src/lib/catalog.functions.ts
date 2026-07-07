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
