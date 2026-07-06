import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Vitrines públicas do site. Retorna DTOs enxutos e serializáveis para o
 * carrossel de produtos no /catalogo e na home.
 *
 * Usa supabaseAdmin porque a maioria dos produtos ainda está em `enriched`
 * (workflow interno) e o RLS público só libera `published`. A seleção é
 * hard-coded e limitada: `status IN (enriched, published) AND is_available`.
 */

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

const BUCKET = "catalog-media";

function publicUrl(base: string, path: string | null): string | null {
  if (!path) return null;
  return `${base}/storage/v1/object/public/${BUCKET}/${path.replace(/^\/+/, "")}`;
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

    const productIds = (prods ?? []).map((p) => p.id);
    let imagesByProduct = new Map<string, { storage_path: string | null; source_url: string | null; alt_text: string | null }>();
    if (productIds.length > 0) {
      const { data: imgs } = await supabaseAdmin
        .from("product_images")
        .select("product_id, storage_path, source_url, alt_text, is_main, position")
        .in("product_id", productIds)
        .order("is_main", { ascending: false })
        .order("position", { ascending: true });
      for (const img of imgs ?? []) {
        if (!imagesByProduct.has(img.product_id)) {
          imagesByProduct.set(img.product_id, {
            storage_path: img.storage_path,
            source_url: img.source_url,
            alt_text: img.alt_text,
          });
        }
      }
    }

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
