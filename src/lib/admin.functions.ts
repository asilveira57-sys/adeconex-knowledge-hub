import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Admin catalog server functions.
 * All fns are protected by requireSupabaseAuth + explicit role check via has_role.
 */

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", {
    _user_id: context.userId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    return { roles: (data ?? []).map((r: { role: string }) => r.role) };
  });

export const getCatalogStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const [{ count: total }, { count: published }, { count: needsReview }, { count: imported }, { count: missingImage }, { count: missingPrice }, { count: variants }, { count: images }, { count: categories }, { count: redirects }] =
      await Promise.all([
        context.supabase.from("products").select("*", { count: "exact", head: true }),
        context.supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "published"),
        context.supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "needs_review"),
        context.supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "imported"),
        context.supabase.from("products").select("*", { count: "exact", head: true }).contains("quality_flags", { missing_image: true }),
        context.supabase.from("products").select("*", { count: "exact", head: true }).contains("quality_flags", { missing_price: true }),
        context.supabase.from("product_variants").select("*", { count: "exact", head: true }),
        context.supabase.from("product_images").select("*", { count: "exact", head: true }),
        context.supabase.from("categories").select("*", { count: "exact", head: true }),
        context.supabase.from("legacy_redirects").select("*", { count: "exact", head: true }),
      ]);
    return {
      products: total ?? 0,
      published: published ?? 0,
      needsReview: needsReview ?? 0,
      imported: imported ?? 0,
      missingImage: missingImage ?? 0,
      missingPrice: missingPrice ?? 0,
      variants: variants ?? 0,
      images: images ?? 0,
      categories: categories ?? 0,
      redirects: redirects ?? 0,
    };
  });

const listInput = z.object({
  search: z.string().optional(),
  status: z.enum(["all", "imported", "needs_review", "enriched", "published", "hidden", "discontinued"]).optional(),
  quality: z.enum(["all", "missing_image", "missing_price", "thin_content"]).optional(),
  kit: z.enum(["all", "with", "without"]).optional(),
  shipping: z.enum(["all", "with", "without", "no_weight"]).optional(),
  custom: z.enum(["all", "with", "without"]).optional(),
  sort: z.enum(["updated_at", "name", "price", "stock_quantity", "weight_kg"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  categoryId: z.string().uuid().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const listProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => listInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const sort = data.sort ?? "updated_at";
    const ascending = (data.dir ?? "desc") === "asc";
    // Only pull the main image + storage_path (uses images_main_by_product_idx)
    let q = context.supabase
      .from("products")
      .select(
        "id, name, slug, price, status, is_available, stock_quantity, old_url, quality_flags, updated_at, sells_by_kit, weight_kg, width_mm, height_mm, length_mm, is_customizable, custom_width_mm, custom_height_mm, product_images(source_url, storage_path, is_main)",
        { count: "estimated" },
      )
      .eq("product_images.is_main", true)
      .order(sort, { ascending, nullsFirst: false })
      .range(from, to);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.quality && data.quality !== "all") q = q.contains("quality_flags", { [data.quality]: true });
    if (data.kit === "with") q = q.eq("sells_by_kit", true);
    if (data.kit === "without") q = q.eq("sells_by_kit", false);
    if (data.shipping === "with") {
      q = q
        .not("weight_kg", "is", null)
        .not("width_mm", "is", null)
        .not("height_mm", "is", null)
        .not("length_mm", "is", null);
    }
    if (data.shipping === "without") {
      q = q.or("weight_kg.is.null,width_mm.is.null,height_mm.is.null,length_mm.is.null");
    }
    if (data.shipping === "no_weight") q = q.is("weight_kg", null);
    if (data.custom === "with") q = q.eq("is_customizable", true);
    if (data.custom === "without") q = q.eq("is_customizable", false);
    if (data.categoryId) {
      const { data: pcs } = await context.supabase.from("product_categories").select("product_id").eq("category_id", data.categoryId);
      const ids = (pcs ?? []).map((r: { product_id: string }) => r.product_id);
      if (ids.length === 0) return { rows: [], total: 0 };
      q = q.in("id", ids);
    }
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], total: count ?? 0 };
  });


export const listCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data } = await context.supabase.from("categories").select("id, name, legacy_id").order("name");
    return { categories: data ?? [] };
  });

const updateStatusInput = z.object({
  productId: z.string().uuid(),
  status: z.enum(["imported", "needs_review", "enriched", "published", "hidden", "discontinued"]),
});

export const updateProductStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => updateStatusInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const patch: { status: typeof data.status; published_at?: string } = { status: data.status };
    if (data.status === "published") patch.published_at = new Date().toISOString();
    const { error } = await context.supabase.from("products").update(patch).eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const dimsInput = z.object({
  productId: z.string().uuid(),
  weight_kg: z.number().min(0).max(200).nullable(),
  width_mm: z.number().min(0).max(5000).nullable(),
  height_mm: z.number().min(0).max(5000).nullable(),
  length_mm: z.number().min(0).max(5000).nullable(),
});

export const updateProductDimensions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => dimsInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("products")
      .update({
        weight_kg: data.weight_kg,
        width_mm: data.width_mm,
        height_mm: data.height_mm,
        length_mm: data.length_mm,
      })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


const bulkInput = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(["imported", "needs_review", "enriched", "published", "hidden", "discontinued"]),
});

export const bulkUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => bulkInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const patch: { status: typeof data.status; published_at?: string } = { status: data.status };
    if (data.status === "published") patch.published_at = new Date().toISOString();
    const { error } = await context.supabase.from("products").update(patch).in("id", data.productIds);
    if (error) throw new Error(error.message);
    return { ok: true, updated: data.productIds.length };
  });


export const getImportLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { data } = await context.supabase
      .from("legacy_import_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    return { logs: data ?? [] };
  });

export const grantAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ email: z.string().email() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.users.find((u) => u.email === data.email);
    if (!user) throw new Error("Usuário não encontrado");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const getProductPreview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ productId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: product, error } = await context.supabase
      .from("products")
      .select(
        "id, name, slug, sku, model, reference, price, promotional_price, stock_quantity, is_available, status, short_description, commercial_description, technical_description, seo_title, seo_description, seo_keywords, old_url, quality_flags, updated_at, weight_kg, width_mm, height_mm, length_mm, sells_by_kit",
      )
      .eq("id", data.productId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!product) throw new Error("Produto não encontrado");

    const [{ data: images }, { data: faqs }, { data: cats }, { data: kits }] = await Promise.all([
      context.supabase
        .from("product_images")
        .select("id, source_url, storage_path, is_main, position, alt_text")
        .eq("product_id", data.productId)
        .order("position"),
      context.supabase
        .from("product_faqs")
        .select("id, question, answer, position, is_ai_generated, is_reviewed")
        .eq("product_id", data.productId)
        .order("position"),
      context.supabase
        .from("product_categories")
        .select("category:categories(id, name, slug)")
        .eq("product_id", data.productId),
      context.supabase
        .from("product_variants")
        .select(
          "id, name, sku, units_per_pack, price, promotional_price, stock_mode, stock_quantity, weight_kg, width_mm, height_mm, length_mm, is_active, sort_order",
        )
        .eq("product_id", data.productId)
        .eq("is_kit", true)
        .order("sort_order"),
    ]);

    return {
      product,
      images: images ?? [],
      faqs: faqs ?? [],
      categories: (cats ?? []).map((r: { category: { id: string; name: string; slug: string } | null }) => r.category).filter(Boolean),
      kits: kits ?? [],
    };
  });

export const setSellsByKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ productId: z.string().uuid(), sells_by_kit: z.boolean() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("products")
      .update({ sells_by_kit: data.sells_by_kit })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const kitInput = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  name: z.string().min(1).max(120),
  sku: z.string().max(80).nullable().optional(),
  units_per_pack: z.number().int().min(1).max(100000),
  price: z.number().min(0).nullable(),
  promotional_price: z.number().min(0).nullable().optional(),
  stock_mode: z.enum(["own", "derived"]),
  stock_quantity: z.number().int().min(0).nullable().optional(),
  weight_kg: z.number().min(0).max(200).nullable().optional(),
  width_mm: z.number().min(0).max(5000).nullable().optional(),
  height_mm: z.number().min(0).max(5000).nullable().optional(),
  length_mm: z.number().min(0).max(5000).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

export const upsertProductKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => kitInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const row = {
      product_id: data.productId,
      name: data.name,
      sku: data.sku ?? null,
      units_per_pack: data.units_per_pack,
      price: data.price,
      promotional_price: data.promotional_price ?? null,
      stock_mode: data.stock_mode,
      stock_quantity: data.stock_mode === "own" ? (data.stock_quantity ?? 0) : null,
      weight_kg: data.weight_kg ?? null,
      width_mm: data.width_mm ?? null,
      height_mm: data.height_mm ?? null,
      length_mm: data.length_mm ?? null,
      sort_order: data.sort_order,
      is_active: data.is_active,
      is_kit: true,
    };
    if (data.id) {
      const { error } = await context.supabase
        .from("product_variants")
        .update(row)
        .eq("id", data.id)
        .eq("product_id", data.productId);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("product_variants")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const deleteProductKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ id: z.string().uuid(), productId: z.string().uuid() }).parse(v),
  )
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("product_variants")
      .delete()
      .eq("id", data.id)
      .eq("product_id", data.productId)
      .eq("is_kit", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


