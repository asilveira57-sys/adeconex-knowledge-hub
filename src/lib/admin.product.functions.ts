import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Edição profissional de produtos (Admin).
 * Todas as funções exigem sessão + papel admin/editor (is_staff).
 */

type Ctx = { supabase: any; userId: string };

async function assertStaff(context: Ctx) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

// ============================================================================
// Leitura completa para o editor
// ============================================================================

export const getProductEditor = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: product, error } = await context.supabase
      .from("products")
      .select("*")
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) throw new Error("Produto não encontrado");

    const [
      { data: images },
      { data: faqs },
      { data: pcats },
      { data: variants },
      { data: videos },
      { data: allCategories },
      { data: brands },
      { data: badges },
      { data: assignments },
      { data: redirects },
    ] = await Promise.all([
      context.supabase
        .from("product_images")
        .select("id, source_url, storage_path, is_main, position, alt_text, caption, image_type")
        .eq("product_id", data.productId)
        .order("position"),
      context.supabase
        .from("product_faqs")
        .select("id, question, answer, position, is_ai_generated, is_reviewed")
        .eq("product_id", data.productId)
        .order("position"),
      context.supabase
        .from("product_categories")
        .select("category_id, is_primary")
        .eq("product_id", data.productId),
      context.supabase
        .from("product_variants")
        .select(
          "id, name, sku, units_per_pack, price, promotional_price, stock_mode, stock_quantity, weight_kg, width_mm, height_mm, length_mm, is_active, sort_order, is_kit",
        )
        .eq("product_id", data.productId)
        .order("sort_order"),
      context.supabase
        .from("product_videos")
        .select("id, video_url, platform, title, position")
        .eq("product_id", data.productId)
        .order("position"),
      context.supabase.from("categories").select("id, name, slug").order("name"),
      context.supabase.from("brands").select("id, name").order("name"),
      context.supabase.from("product_badges").select("*").order("priority"),
      context.supabase
        .from("product_badge_assignments")
        .select("id, badge_id, source, starts_at, ends_at")
        .eq("product_id", data.productId),
      context.supabase
        .from("legacy_redirects")
        .select("id, old_url, new_url, is_active, hits")
        .eq("entity_id", data.productId),
    ]);

    return {
      product,
      images: images ?? [],
      faqs: faqs ?? [],
      categoryLinks: pcats ?? [],
      kits: (variants ?? []).filter((v: any) => v.is_kit),
      variants: variants ?? [],
      videos: videos ?? [],
      allCategories: allCategories ?? [],
      brands: brands ?? [],
      badges: badges ?? [],
      badgeAssignments: assignments ?? [],
      redirects: redirects ?? [],
    };
  });

// ============================================================================
// Dados básicos
// ============================================================================

const basicsInput = z.object({
  productId: z.string().uuid(),
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(160),
  sku: z.string().trim().max(80).nullable(),
  ean: z.string().trim().max(40).nullable(),
  model: z.string().trim().max(120).nullable(),
  reference: z.string().trim().max(120).nullable(),
  brand_id: z.string().uuid().nullable(),
  short_description: z.string().trim().max(600).nullable(),
  categoryIds: z.array(z.string().uuid()).max(20).default([]),
  primaryCategoryId: z.string().uuid().nullable().optional(),
});

export const updateProductBasics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => basicsInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const slug = slugify(data.slug);
    if (!slug) throw new Error("Slug inválido");

    const { data: clash } = await context.supabase
      .from("products")
      .select("id")
      .eq("slug", slug)
      .neq("id", data.productId)
      .maybeSingle();
    if (clash) throw new Error("Já existe outro produto com este slug");

    const { data: current } = await context.supabase
      .from("products")
      .select("slug")
      .eq("id", data.productId)
      .maybeSingle();

    const { error } = await context.supabase
      .from("products")
      .update({
        name: data.name,
        slug,
        sku: data.sku,
        ean: data.ean,
        model: data.model,
        reference: data.reference,
        brand_id: data.brand_id,
        short_description: data.short_description,
        category_id: data.primaryCategoryId ?? null,
      })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);

    // Redirect 301 automático quando o slug muda
    if (current?.slug && current.slug !== slug) {
      await context.supabase.from("legacy_redirects").insert({
        old_url: `/produto/${current.slug}`,
        new_url: `/produto/${slug}`,
        entity_type: "product",
        entity_id: data.productId,
        http_status: 301,
        is_active: true,
      } as any);
    }

    // Categorias
    await context.supabase.from("product_categories").delete().eq("product_id", data.productId);
    if (data.categoryIds.length > 0) {
      const rows = data.categoryIds.map((cid) => ({
        product_id: data.productId,
        category_id: cid,
        is_primary: cid === data.primaryCategoryId,
      }));
      const { error: cerr } = await context.supabase.from("product_categories").insert(rows as any);
      if (cerr) throw new Error(cerr.message);
    }
    return { ok: true, slug };
  });

// ============================================================================
// Conteúdo (CMS)
// ============================================================================

const contentInput = z.object({
  productId: z.string().uuid(),
  commercial_description: z.string().max(120_000).nullable(),
  technical_description: z.string().max(120_000).nullable(),
  included_items: z.string().max(4000).nullable().optional(),
  warranty: z.string().max(2000).nullable().optional(),
});

export const updateProductContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => contentInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("products")
      .update({
        commercial_description: data.commercial_description,
        technical_description: data.technical_description,
        included_items: data.included_items ?? null,
        warranty: data.warranty ?? null,
      })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// Preço e estoque
// ============================================================================

const pricingInput = z.object({
  productId: z.string().uuid(),
  price: z.number().min(0).max(1_000_000).nullable(),
  promotional_price: z.number().min(0).max(1_000_000).nullable(),
  promo_starts_at: z.string().nullable().optional(),
  promo_ends_at: z.string().nullable().optional(),
  cost_price: z.number().min(0).max(1_000_000).nullable().optional(),
  stock_quantity: z.number().int().min(0).max(10_000_000).nullable(),
  min_stock: z.number().int().min(0).max(1_000_000).nullable().optional(),
  availability_status: z.enum([
    "in_stock",
    "out_of_stock",
    "preorder",
    "discontinued",
    "made_to_order",
  ]),
  is_available: z.boolean(),
});

export const updateProductPricing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => pricingInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (
      data.promotional_price != null &&
      data.price != null &&
      data.promotional_price >= data.price
    ) {
      throw new Error("Preço promocional deve ser menor que o preço normal");
    }
    if (data.promo_starts_at && data.promo_ends_at && data.promo_starts_at > data.promo_ends_at) {
      throw new Error("Início da promoção deve ser anterior ao fim");
    }
    const { error } = await context.supabase
      .from("products")
      .update({
        price: data.price,
        promotional_price: data.promotional_price,
        promo_starts_at: data.promo_starts_at ?? null,
        promo_ends_at: data.promo_ends_at ?? null,
        cost_price: data.cost_price ?? null,
        stock_quantity: data.stock_quantity,
        min_stock: data.min_stock ?? null,
        availability_status: data.availability_status,
        is_available: data.is_available,
      })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adjustStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        productId: z.string().uuid(),
        mode: z.enum(["set", "add", "subtract"]),
        amount: z.number().int().min(0).max(10_000_000),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: cur } = await context.supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", data.productId)
      .maybeSingle();
    const current = Number(cur?.stock_quantity ?? 0);
    const next =
      data.mode === "set"
        ? data.amount
        : data.mode === "add"
          ? current + data.amount
          : Math.max(0, current - data.amount);
    const { error } = await context.supabase
      .from("products")
      .update({ stock_quantity: next, is_available: next > 0 })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true, stock_quantity: next };
  });

// ============================================================================
// SEO
// ============================================================================

const seoInput = z.object({
  productId: z.string().uuid(),
  seo_title: z.string().trim().max(200).nullable(),
  seo_description: z.string().trim().max(400).nullable(),
  seo_keywords: z.string().trim().max(600).nullable(),
  canonical_url: z.string().trim().max(400).nullable().optional(),
  indexable: z.boolean().default(true),
});

export const updateProductSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => seoInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("products")
      .update({
        seo_title: data.seo_title,
        seo_description: data.seo_description,
        seo_keywords: data.seo_keywords,
      })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);

    const { data: prod } = await context.supabase
      .from("products")
      .select("slug, name")
      .eq("id", data.productId)
      .maybeSingle();

    const { data: page } = await context.supabase
      .from("seo_pages")
      .select("id")
      .eq("entity_type", "product")
      .eq("entity_id", data.productId)
      .maybeSingle();

    const row = {
      entity_type: "product",
      entity_id: data.productId,
      path: `/produto/${prod?.slug ?? ""}`,
      title: data.seo_title ?? prod?.name ?? "Produto",
      meta_description: data.seo_description,
      keywords: data.seo_keywords,
      canonical_url: data.canonical_url ?? null,
      schema_type: "Product",
      indexable: data.indexable,
      is_published: true,
    };
    if (page) {
      await context.supabase.from("seo_pages").update(row as any).eq("id", page.id);
    } else {
      await context.supabase.from("seo_pages").insert(row as any);
    }
    return { ok: true };
  });

export const upsertProductRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        productId: z.string().uuid(),
        id: z.string().uuid().optional(),
        old_url: z.string().trim().min(1).max(500),
        new_url: z.string().trim().min(1).max(500),
        is_active: z.boolean().default(true),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const row = {
      old_url: data.old_url,
      new_url: data.new_url,
      entity_type: "product",
      entity_id: data.productId,
      http_status: 301,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("legacy_redirects")
        .update(row as any)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("legacy_redirects")
      .insert(row as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteProductRedirect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("legacy_redirects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// FAQs
// ============================================================================

export const upsertProductFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: z.string().uuid().optional(),
        productId: z.string().uuid(),
        question: z.string().trim().min(3).max(400),
        answer: z.string().trim().min(3).max(6000),
        position: z.number().int().min(0).max(999).default(0),
        is_reviewed: z.boolean().default(true),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const row = {
      product_id: data.productId,
      question: data.question,
      answer: data.answer,
      position: data.position,
      is_reviewed: data.is_reviewed,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("product_faqs")
        .update(row as any)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("product_faqs")
      .insert(row as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteProductFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("product_faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// Mídia
// ============================================================================

export const updateProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: z.string().uuid(),
        productId: z.string().uuid(),
        alt_text: z.string().max(300).nullable().optional(),
        caption: z.string().max(400).nullable().optional(),
        position: z.number().int().min(0).max(999).optional(),
        is_main: z.boolean().optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (data.is_main) {
      await context.supabase
        .from("product_images")
        .update({ is_main: false })
        .eq("product_id", data.productId);
    }
    const patch: Record<string, unknown> = {};
    if (data.alt_text !== undefined) patch.alt_text = data.alt_text;
    if (data.caption !== undefined) patch.caption = data.caption;
    if (data.position !== undefined) patch.position = data.position;
    if (data.is_main !== undefined) patch.is_main = data.is_main;
    const { error } = await context.supabase
      .from("product_images")
      .update(patch as any)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addProductImageByUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        productId: z.string().uuid(),
        url: z.string().url().max(1000),
        alt_text: z.string().max(300).nullable().optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { count } = await context.supabase
      .from("product_images")
      .select("*", { count: "exact", head: true })
      .eq("product_id", data.productId);
    const { data: ins, error } = await context.supabase
      .from("product_images")
      .insert({
        product_id: data.productId,
        source_url: data.url,
        alt_text: data.alt_text ?? null,
        image_type: "gallery",
        position: count ?? 0,
        is_main: (count ?? 0) === 0,
      } as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteProductImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("product_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const upsertProductVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: z.string().uuid().optional(),
        productId: z.string().uuid(),
        video_url: z.string().url().max(600),
        platform: z.enum(["youtube", "vimeo", "mp4", "other"]).default("youtube"),
        title: z.string().max(200).nullable().optional(),
        position: z.number().int().min(0).max(99).default(0),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const row = {
      product_id: data.productId,
      video_url: data.video_url,
      platform: data.platform,
      title: data.title ?? null,
      position: data.position,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("product_videos")
        .update(row as any)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("product_videos")
      .insert(row as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteProductVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("product_videos").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================================
// Ciclo de vida
// ============================================================================

export const duplicateProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: src, error } = await context.supabase
      .from("products")
      .select("*")
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!src) throw new Error("Produto não encontrado");

    const copy: Record<string, unknown> = { ...src };
    delete copy.id;
    delete copy.created_at;
    delete copy.updated_at;
    delete copy.legacy_id;
    delete copy.published_at;
    copy.name = `${src.name} (cópia)`;
    copy.slug = `${slugify(src.slug)}-copia-${Date.now().toString(36)}`;
    copy.sku = src.sku ? `${src.sku}-COPY` : null;
    copy.status = "needs_review";
    copy.old_url = null;
    copy.new_url = null;

    const { data: ins, error: insErr } = await context.supabase
      .from("products")
      .insert(copy as any)
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    const { data: cats } = await context.supabase
      .from("product_categories")
      .select("category_id, is_primary")
      .eq("product_id", data.productId);
    if (cats?.length) {
      await context.supabase.from("product_categories").insert(
        cats.map((c: any) => ({
          product_id: ins.id,
          category_id: c.category_id,
          is_primary: c.is_primary,
        })) as any,
      );
    }

    const { data: imgs } = await context.supabase
      .from("product_images")
      .select("source_url, storage_path, image_type, position, alt_text, caption, is_main")
      .eq("product_id", data.productId);
    if (imgs?.length) {
      await context.supabase
        .from("product_images")
        .insert(imgs.map((i: any) => ({ ...i, product_id: ins.id })) as any);
    }

    return { ok: true, id: ins.id as string };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ productId: z.string().uuid(), hard: z.boolean().default(false) }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    if (!data.hard) {
      const { error } = await context.supabase
        .from("products")
        .update({ status: "discontinued", is_available: false })
        .eq("id", data.productId);
      if (error) throw new Error(error.message);
      return { ok: true, mode: "soft" as const };
    }
    const { count } = await context.supabase
      .from("order_items")
      .select("*", { count: "exact", head: true })
      .eq("product_id", data.productId);
    if ((count ?? 0) > 0) {
      throw new Error(
        "Este produto já foi vendido e não pode ser excluído definitivamente. Use 'Descontinuar'.",
      );
    }
    for (const table of [
      "product_badge_assignments",
      "product_faqs",
      "product_images",
      "product_videos",
      "product_specifications",
      "product_categories",
      "product_variants",
    ]) {
      await (context.supabase as any).from(table).delete().eq("product_id", data.productId);
    }
    const { error } = await context.supabase.from("products").delete().eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true, mode: "hard" as const };
  });

// ============================================================================
// Selos
// ============================================================================

export const listBadges = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data } = await context.supabase.from("product_badges").select("*").order("priority");
    return { badges: data ?? [] };
  });

const badgeInput = z.object({
  id: z.string().uuid().optional(),
  key: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9_]+$/, "Use apenas letras minúsculas, números e _"),
  label: z.string().trim().min(2).max(60),
  color: z.enum(["primary", "secondary", "accent", "destructive", "success", "muted"]),
  icon: z.string().max(40).nullable().optional(),
  priority: z.number().int().min(0).max(999).default(100),
  auto_rule: z.enum(["none", "best_seller", "low_stock", "new_arrival", "on_sale", "free_shipping"]),
  rule_threshold: z.number().min(0).max(1_000_000).nullable().optional(),
  is_active: z.boolean().default(true),
});

export const upsertBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => badgeInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const row = {
      key: data.key,
      label: data.label,
      color: data.color,
      icon: data.icon ?? null,
      priority: data.priority,
      auto_rule: data.auto_rule,
      rule_threshold: data.rule_threshold ?? null,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("product_badges")
        .update(row as any)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: ins, error } = await context.supabase
      .from("product_badges")
      .insert(row as any)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

export const deleteBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("product_badges").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setProductBadges = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        productId: z.string().uuid(),
        badges: z
          .array(
            z.object({
              badge_id: z.string().uuid(),
              starts_at: z.string().nullable().optional(),
              ends_at: z.string().nullable().optional(),
            }),
          )
          .max(20),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    await context.supabase
      .from("product_badge_assignments")
      .delete()
      .eq("product_id", data.productId)
      .eq("source", "manual");
    if (data.badges.length > 0) {
      const { error } = await context.supabase.from("product_badge_assignments").insert(
        data.badges.map((b) => ({
          product_id: data.productId,
          badge_id: b.badge_id,
          source: "manual",
          starts_at: b.starts_at ?? null,
          ends_at: b.ends_at ?? null,
        })) as any,
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
