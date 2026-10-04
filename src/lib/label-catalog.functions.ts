import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { layerSchema } from "@/lib/labels/schema";
import type { LabelLayer, LabelShape } from "@/lib/labels/shared";

export type LabelSize = {
  width_mm: number;
  height_mm: number;
  shape: LabelShape;
  corner_radius_mm: number | null;
};

export type BlogImage = { url: string; alt: string };

export type LabelTemplate = {
  id: string;
  type_id: string;
  name: string;
  width_mm: number;
  height_mm: number;
  shape: LabelShape;
  corner_radius_mm: number | null;
  material: string;
  ribbon_color: string;
  background_color: string;
  layout: LabelLayer[];
  is_published: boolean;
  sort_order: number;
};

export type LabelType = {
  id: string;
  slug: string;
  name: string;
  short_description: string | null;
  usage: string | null;
  cover_url: string | null;
  sizes: LabelSize[];
  blog_title: string | null;
  blog_excerpt: string | null;
  blog_body: string | null;
  blog_tips: string | null;
  blog_images: BlogImage[];
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
  sort_order: number;
  updated_at: string;
};

export type LabelTypeWithTemplates = LabelType & { templates: LabelTemplate[] };

const TYPE_COLUMNS =
  "id, slug, name, short_description, usage, cover_url, sizes, blog_title, blog_excerpt, blog_body, blog_tips, blog_images, seo_title, seo_description, is_published, sort_order, updated_at";
const TEMPLATE_COLUMNS =
  "id, type_id, name, width_mm, height_mm, shape, corner_radius_mm, material, ribbon_color, background_color, layout, is_published, sort_order";

function publicClient() {
  return createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function toType(r: any): LabelType {
  return {
    ...r,
    sizes: Array.isArray(r.sizes) ? r.sizes : [],
    blog_images: Array.isArray(r.blog_images) ? r.blog_images : [],
  };
}
function toTemplate(r: any): LabelTemplate {
  return {
    ...r,
    width_mm: Number(r.width_mm),
    height_mm: Number(r.height_mm),
    corner_radius_mm: r.corner_radius_mm == null ? null : Number(r.corner_radius_mm),
    layout: Array.isArray(r.layout) ? r.layout : [],
  };
}

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (!data) throw new Error("Acesso restrito à equipe");
}

/* ---------- Público ---------- */

export const listPublicLabelTypes = createServerFn({ method: "GET" }).handler(
  async (): Promise<LabelTypeWithTemplates[]> => {
    const client = publicClient();
    const [{ data: types }, { data: templates }] = await Promise.all([
      client.from("custom_label_types").select(TYPE_COLUMNS).eq("is_published", true).order("sort_order"),
      client.from("label_templates").select(TEMPLATE_COLUMNS).eq("is_published", true).order("sort_order"),
    ]);
    const tpls = (templates ?? []).map(toTemplate);
    return (types ?? []).map((t) => ({
      ...toType(t),
      templates: tpls.filter((x) => x.type_id === (t as any).id),
    }));
  },
);

export const getPublicLabelType = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<LabelTypeWithTemplates | null> => {
    const client = publicClient();
    const { data: row } = await client
      .from("custom_label_types")
      .select(TYPE_COLUMNS)
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (!row) return null;
    const { data: templates } = await client
      .from("label_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("type_id", (row as any).id)
      .eq("is_published", true)
      .order("sort_order");
    return { ...toType(row), templates: (templates ?? []).map(toTemplate) };
  });

export const getPublicTemplate = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<LabelTemplate | null> => {
    const { data: row } = await publicClient()
      .from("label_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    return row ? toTemplate(row) : null;
  });

/* ---------- Admin ---------- */

export const adminListLabelTypes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<(LabelType & { template_count: number })[]> => {
    await assertStaff(context);
    const [{ data: types, error }, { data: tpls }] = await Promise.all([
      context.supabase.from("custom_label_types").select(TYPE_COLUMNS).order("sort_order"),
      context.supabase.from("label_templates").select("type_id"),
    ]);
    if (error) throw new Error(error.message);
    return (types ?? []).map((t: any) => ({
      ...toType(t),
      template_count: (tpls ?? []).filter((x: any) => x.type_id === t.id).length,
    }));
  });

export const adminGetLabelType = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }): Promise<LabelTypeWithTemplates | null> => {
    await assertStaff(context);
    const { data: row } = await context.supabase
      .from("custom_label_types")
      .select(TYPE_COLUMNS)
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return null;
    const { data: templates } = await context.supabase
      .from("label_templates")
      .select(TEMPLATE_COLUMNS)
      .eq("type_id", data.id)
      .order("sort_order");
    return { ...toType(row), templates: (templates ?? []).map(toTemplate) };
  });

const sizeSchema = z.object({
  width_mm: z.number().min(5).max(400),
  height_mm: z.number().min(5).max(400),
  shape: z.enum(["rect", "rounded", "circle", "oval"]),
  corner_radius_mm: z.number().min(0).max(100).nullable(),
});

const nullableText = (max: number) =>
  z.string().max(max).nullable().optional().transform((v) => (v && v.trim() ? v.trim() : null));

export const labelTypeInputSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use só letras minúsculas, números e hífen"),
  name: z.string().trim().min(2).max(120),
  short_description: nullableText(300),
  usage: nullableText(1000),
  cover_url: nullableText(600),
  sizes: z.array(sizeSchema).min(1, "Cadastre pelo menos uma medida").max(30),
  blog_title: nullableText(160),
  blog_excerpt: nullableText(400),
  blog_body: nullableText(30000),
  blog_tips: nullableText(6000),
  blog_images: z.array(z.object({ url: z.string().url().max(600), alt: z.string().max(200) })).max(12),
  seo_title: nullableText(70),
  seo_description: nullableText(170),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0).max(9999),
});

export const adminSaveLabelType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => labelTypeInputSchema.parse(d))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    await assertStaff(context);
    const { id, ...payload } = data;
    const q = id
      ? context.supabase.from("custom_label_types").update(payload).eq("id", id)
      : context.supabase.from("custom_label_types").insert(payload);
    const { data: row, error } = await q.select("id").single();
    if (error) {
      if (error.code === "23505") throw new Error("Já existe um tipo com esse endereço (slug)");
      throw new Error(error.message);
    }
    return { id: row.id };
  });

export const adminDeleteLabelType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("custom_label_types").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Copia uma arte salva (Minhas artes) para virar arte pronta de um tipo. */
export const adminImportTemplateFromDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ type_id: z.string().uuid(), design_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: d, error } = await context.supabase
      .from("label_designs")
      .select("name, width_mm, height_mm, shape, corner_radius_mm, material, ribbon_color, background_color, layout")
      .eq("id", data.design_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!d) throw new Error("Arte não encontrada nas suas artes salvas");
    const layout = z.array(layerSchema).max(40).parse(d.layout ?? []);
    const { count } = await context.supabase
      .from("label_templates")
      .select("id", { count: "exact", head: true })
      .eq("type_id", data.type_id);
    const { error: insErr } = await context.supabase.from("label_templates").insert({
      type_id: data.type_id,
      name: d.name,
      width_mm: d.width_mm,
      height_mm: d.height_mm,
      shape: d.shape,
      corner_radius_mm: d.corner_radius_mm,
      material: d.material,
      ribbon_color: d.ribbon_color,
      background_color: d.background_color,
      layout,
      sort_order: count ?? 0,
    });
    if (insErr) throw new Error(insErr.message);
    return { ok: true };
  });

export const adminUpdateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(1).max(80).optional(),
        is_published: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("label_templates").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("label_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
