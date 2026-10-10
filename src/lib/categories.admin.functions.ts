import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPermissions } from "./staff.functions";

async function assertSection(context: any) {
  const p = await loadPermissions(context);
  if (!p.isStaff || !(p.isAdmin || p.sections.includes("categorias"))) throw new Error("Forbidden");
}

export const adminListCategories = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSection(context);
    const [{ data: cats, error }, { data: links }] = await Promise.all([
      context.supabase
        .from("categories")
        .select("id, parent_id, name, slug, description, seo_title, seo_description, sort_order, is_published")
        .order("sort_order")
        .order("name"),
      context.supabase.from("product_categories").select("category_id").limit(20000),
    ]);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const l of links ?? []) counts.set(l.category_id, (counts.get(l.category_id) ?? 0) + 1);
    return (cats ?? []).map((c) => ({ ...c, products: counts.get(c.id) ?? 0 }));
  });

const saveSchema = z.object({
  id: z.string().uuid().optional(),
  parent_id: z.string().uuid().nullable(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/, "Use letras minúsculas, números e hífen"),
  description: z.string().max(5000).nullable().optional(),
  seo_title: z.string().max(200).nullable().optional(),
  seo_description: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).max(100000),
  is_published: z.boolean(),
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => saveSchema.parse(v))
  .handler(async ({ context, data }) => {
    await assertSection(context);
    if (data.id && data.parent_id === data.id) throw new Error("Uma categoria não pode ser filha dela mesma");
    const payload = { ...data, description: data.description || null, seo_title: data.seo_title || null, seo_description: data.seo_description || null };
    const q = data.id
      ? context.supabase.from("categories").update(payload).eq("id", data.id)
      : context.supabase.from("categories").insert(payload);
    const { error } = await q;
    if (error) throw new Error(error.code === "23505" ? "Já existe uma categoria com esse endereço (slug)" : error.message);
    return { ok: true };
  });
