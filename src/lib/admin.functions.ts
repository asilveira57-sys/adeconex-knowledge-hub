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
    let q = context.supabase
      .from("products")
      .select("id, name, slug, price, status, is_available, stock_quantity, old_url, quality_flags, updated_at, product_images(source_url, is_main)", { count: "exact" })
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (data.search) q = q.ilike("name", `%${data.search}%`);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    if (data.quality && data.quality !== "all") q = q.contains("quality_flags", { [data.quality]: true });
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


const bulkInput = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(500),
  status: z.enum(["imported", "needs_review", "enriched", "published", "hidden", "discontinued"]),
});

export const bulkUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => bulkInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const patch: Record<string, unknown> = { status: data.status };
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
