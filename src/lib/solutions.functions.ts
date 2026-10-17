import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateJourney, slugify, type JourneyDraft, type StepDraft, type RecDraft } from "./solutions.shared";

// ---------- Público ----------

export const getSolutionCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { createCatalogPublicClient } = await import("./catalog-public.server");
  const sb = createCatalogPublicClient();
  const [{ data: cats, error }, { data: js }] = await Promise.all([
    sb.from("solution_categories").select("id, slug, name, short_description, cover_url, cover_alt, sort_order").eq("is_active", true).order("sort_order"),
    sb.from("solution_journeys").select("slug, title, category_id, sort_order").eq("status", "published").order("sort_order"),
  ]);
  if (error) throw new Error("Não foi possível carregar as soluções.");
  return (cats ?? []).map((c) => ({ ...c, journeys: (js ?? []).filter((j) => j.category_id === c.id).map((j) => ({ slug: j.slug, title: j.title })) }));
});

export const getPublicJourney = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ slug: z.string().min(1).max(120) }).parse(v))
  .handler(async ({ data }) => {
    const { createCatalogPublicClient } = await import("./catalog-public.server");
    const sb = createCatalogPublicClient();
    const { data: j } = await sb.from("solution_journeys").select("*, solution_categories(name, slug)").eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!j) return null;
    const { data: steps } = await sb.from("solution_steps").select("*").eq("journey_id", j.id).order("sort_order");
    const stepIds = (steps ?? []).map((s) => s.id);
    const { data: recs } = stepIds.length
      ? await sb.from("solution_recommendations").select("*").in("step_id", stepIds).eq("is_active", true).order("sort_order")
      : { data: [] as any[] };
    const productIds = [...new Set((recs ?? []).map((r) => r.product_id).filter(Boolean) as string[])];
    const { loadShowcaseByIds } = await import("./catalog.functions");
    const products = await loadShowcaseByIds(productIds);
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      journey: {
        title: j.title, slug: j.slug, h1: j.h1, intro: j.intro, cover_url: j.cover_url, cover_alt: j.cover_alt,
        presentation: j.presentation, closing: j.closing, content_before: j.content_before, content_after: j.content_after,
        seo_title: j.seo_title, seo_description: j.seo_description, canonical_url: j.canonical_url, indexable: j.indexable,
        faqs: (j.faqs ?? []) as { q: string; a: string }[],
        category: (j as any).solution_categories as { name: string; slug: string } | null,
      },
      steps: (steps ?? []).map((s) => ({
        id: s.id, title: s.title, body: s.body, step_type: s.step_type as StepDraft["step_type"], image_url: s.image_url, image_alt: s.image_alt,
        is_required: s.is_required, guidance: s.guidance, options: (s.options ?? []) as StepDraft["options"], condition: (s.condition ?? null) as StepDraft["condition"],
        items: (recs ?? []).filter((r) => r.step_id === s.id).flatMap((r) => {
          const p = r.product_id ? byId.get(r.product_id) : null;
          if (r.product_id && !p) return []; // produto oculto/removido: não mostra
          return [{
            id: r.id, item_category: r.item_category, role: r.role, reason: r.reason, is_required: r.is_required, quantity: r.quantity,
            notes: r.notes, show_when: (r.show_when ?? null) as RecDraft["show_when"], specs: (r.specs ?? {}) as Specs,
            product: p ? { slug: p.slug, name: p.name, image_url: p.image_url, image_alt: p.image_alt, price: p.promotional_price ?? p.price } : null,
            external: p ? null : {
              name: r.ext_name ?? "", description: r.ext_description, manufacturer: r.ext_manufacturer, model: r.ext_model,
              image_url: r.ext_image_url, platform: r.ext_platform, is_affiliate: r.is_affiliate,
              ext_affiliate_url: r.ext_affiliate_url, ext_original_url: r.ext_original_url,
              button: r.ext_button_text, link_ok: r.ext_link_status === "ok",
            },
          }];
        }),
      })),
    };
  });

// ---------- Admin ----------

async function assertStaff(context: { supabase: any; userId: string }) {
  const { loadPermissions } = await import("./staff.functions");
  const p = await loadPermissions(context);
  if (!p.isStaff || !p.sections.includes("assistente")) throw new Error("Acesso negado");
}

export const adminListSolutions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const [{ data: cats }, { data: js }] = await Promise.all([
      sb.from("solution_categories").select("*").order("sort_order"),
      sb.from("solution_journeys").select("id, admin_name, title, slug, status, category_id, sort_order, updated_at").order("sort_order"),
    ]);
    return { categories: cats ?? [], journeys: js ?? [] };
  });

const catSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(80), name: z.string().min(1).max(160),
  short_description: z.string().max(400).nullable(), description: z.string().max(8000).nullable(),
  cover_url: z.string().max(1000).nullable(), cover_alt: z.string().max(300).nullable(), icon: z.string().max(60).nullable(),
  sort_order: z.number().int(), is_active: z.boolean(),
  seo_title: z.string().max(200).nullable(), seo_description: z.string().max(400).nullable(), seo_content: z.string().max(20000).nullable(),
});

export const adminSaveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => catSchema.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const row = { ...data, slug: slugify(data.slug) };
    const q = data.id
      ? context.supabase.from("solution_categories").update(row).eq("id", data.id)
      : context.supabase.from("solution_categories").insert(row);
    const { error } = await q;
    if (error) throw new Error(error.code === "23505" ? "Já existe uma categoria com esse endereço." : error.message);
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("solution_categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetJourney = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const { data: j, error } = await sb.from("solution_journeys").select("*").eq("id", data.id).maybeSingle();
    if (error || !j) throw new Error("Jornada não encontrada");
    const { data: steps } = await sb.from("solution_steps").select("*").eq("journey_id", j.id).order("sort_order");
    const ids = (steps ?? []).map((s: any) => s.id);
    const { data: recs } = ids.length ? await sb.from("solution_recommendations").select("*").in("step_id", ids).order("sort_order") : { data: [] };
    const pids = [...new Set((recs ?? []).map((r: any) => r.product_id).filter(Boolean))] as string[];
    const { data: prods } = pids.length ? await sb.from("products").select("id, name, sku, status").in("id", pids) : { data: [] };
    const draft: JourneyDraft = {
      ...(j as any), faqs: j.faqs ?? [],
      steps: (steps ?? []).map((s: any) => ({ ...s, options: s.options ?? [], recommendations: (recs ?? []).filter((r: any) => r.step_id === s.id) })),
    };
    return { journey: draft, products: (prods ?? []) as { id: string; name: string; sku: string | null; status: string }[] };
  });

export const adminSearchProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ q: z.string().max(100) }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const term = data.q.trim().replace(/[%,()]/g, " ");
    if (term.length < 2) return [];
    const { data: rows } = await context.supabase.from("products").select("id, name, sku, status")
      .or(`name.ilike.%${term}%,sku.ilike.%${term}%`).in("status", ["enriched", "published"]).limit(20);
    return (rows ?? []) as { id: string; name: string; sku: string | null; status: string }[];
  });

const condSchema = z.object({ step_id: z.string().uuid(), values: z.array(z.string().max(80)).max(30) }).nullable();
const n = (max: number) => z.string().max(max).nullable();
const recSchema = z.object({
  id: z.string().uuid(), product_id: z.string().uuid().nullable(), item_category: z.string().min(1).max(60),
  role: n(200), reason: n(2000), is_required: z.boolean(), quantity: n(60), sort_order: z.number().int(), notes: n(2000),
  is_active: z.boolean(), show_when: condSchema,
  ext_name: n(200), ext_description: n(2000), ext_manufacturer: n(120), ext_model: n(120), ext_image_url: n(1000),
  ext_platform: n(120), ext_original_url: n(2000), ext_affiliate_url: n(2000), is_affiliate: z.boolean(),
  ext_offer_id: n(200), ext_checked_at: n(20), ext_link_status: z.string().max(30), ext_button_text: n(60),
  specs: z.object({
    tech: z.enum(["tt", "dt", "both"]).nullable().optional(), max_width_mm: z.number().positive().max(2000).nullable().optional(),
    width_mm: z.number().positive().max(2000).nullable().optional(), material: z.enum(["couche", "bopp", "poliester", "termico"]).nullable().optional(),
    ribbon_type: z.enum(["cera", "misto", "resina"]).nullable().optional(),
  }).default({}),
});
const stepSchema = z.object({
  id: z.string().uuid(), internal_name: n(160), title: z.string().max(200), body: n(20000),
  step_type: z.enum(["text", "single", "multiple", "equipment", "supplies", "accessories", "compare", "final"]),
  image_url: n(1000), image_alt: n(300), sort_order: z.number().int(), is_required: z.boolean(), guidance: n(2000),
  options: z.array(z.object({ value: z.string().min(1).max(80), label: z.string().min(1).max(160), description: z.string().max(400).optional() })).max(30),
  condition: condSchema, recommendations: z.array(recSchema).max(100),
});
const journeySchema = z.object({
  id: z.string().uuid(), category_id: z.string().uuid().nullable(), admin_name: z.string().min(1).max(200),
  title: z.string().min(1).max(200), slug: z.string().min(1).max(80), h1: n(200), intro: n(4000),
  cover_url: n(1000), cover_alt: n(300), presentation: n(20000), closing: n(20000), content_before: n(30000), content_after: n(30000),
  status: z.enum(["draft", "published", "inactive"]), sort_order: z.number().int(),
  seo_title: n(200), seo_description: n(400), canonical_url: n(500), indexable: z.boolean(),
  faqs: z.array(z.object({ q: z.string().min(1).max(300), a: z.string().min(1).max(3000) })).max(30),
  steps: z.array(stepSchema).max(40),
});

export const adminSaveJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => journeySchema.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const j = { ...data, slug: slugify(data.slug) } as JourneyDraft;
    if (j.status === "published") {
      const pids = [...new Set(j.steps.flatMap((s) => s.recommendations.map((r) => r.product_id)).filter(Boolean))] as string[];
      const { data: ok } = pids.length ? await sb.from("products").select("id").in("id", pids).in("status", ["enriched", "published"]) : { data: [] };
      const errs = validateJourney(j, new Set((ok ?? []).map((p: any) => p.id)));
      if (errs.length) return { ok: false as const, errors: errs };
    }
    const { steps, ...row } = j;
    const { error: e1 } = await sb.from("solution_journeys").upsert(row);
    if (e1) return { ok: false as const, errors: [e1.code === "23505" ? "Já existe uma jornada com esse endereço." : e1.message] };
    const stepRows = steps.map(({ recommendations: _r, ...s }, i) => ({ ...s, sort_order: i, journey_id: j.id }));
    const { data: old } = await sb.from("solution_steps").select("id").eq("journey_id", j.id);
    const keep = new Set(stepRows.map((s) => s.id));
    const drop = (old ?? []).map((s: any) => s.id).filter((id: string) => !keep.has(id));
    if (drop.length) await sb.from("solution_steps").delete().in("id", drop);
    if (stepRows.length) {
      const { error } = await sb.from("solution_steps").upsert(stepRows);
      if (error) return { ok: false as const, errors: [error.message] };
    }
    for (const s of steps) {
      const recs = s.recommendations.map((r, i) => ({ ...r, sort_order: i, step_id: s.id, ext_checked_at: r.ext_checked_at || null }));
      const ids = recs.map((r) => r.id);
      const del = sb.from("solution_recommendations").delete().eq("step_id", s.id);
      await (ids.length ? del.not("id", "in", `(${ids.join(",")})`) : del);
      if (recs.length) {
        const { error } = await sb.from("solution_recommendations").upsert(recs);
        if (error) return { ok: false as const, errors: [error.message] };
      }
    }
    return { ok: true as const, errors: [] as string[] };
  });

export const adminCreateJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ title: z.string().min(1).max(200) }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data: row, error } = await context.supabase.from("solution_journeys")
      .insert({ title: data.title, admin_name: data.title, slug, status: "draft" }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const adminDuplicateJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const sb = context.supabase;
    const { data: j } = await sb.from("solution_journeys").select("*").eq("id", data.id).single();
    if (!j) throw new Error("Jornada não encontrada");
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = j;
    const { data: nj, error } = await sb.from("solution_journeys").insert({
      ...rest, admin_name: `${j.admin_name} (cópia)`, title: `${j.title} (cópia)`,
      slug: `${j.slug}-copia-${Math.random().toString(36).slice(2, 6)}`, status: "draft",
    }).select("id").single();
    if (error) throw new Error(error.message);
    const { data: steps } = await sb.from("solution_steps").select("*").eq("journey_id", j.id);
    const map = new Map<string, string>((steps ?? []).map((s: any) => [s.id, crypto.randomUUID()]));
    const remap = (c: any) => (c && map.has(c.step_id) ? { ...c, step_id: map.get(c.step_id) } : null);
    if (steps?.length) {
      await sb.from("solution_steps").insert(steps.map(({ created_at: _a, updated_at: _b, ...s }: any) => ({
        ...s, id: map.get(s.id), journey_id: nj.id, condition: remap(s.condition),
      })));
      const { data: recs } = await sb.from("solution_recommendations").select("*").in("step_id", [...map.keys()]);
      if (recs?.length) await sb.from("solution_recommendations").insert(recs.map(({ id: _i, created_at: _a, updated_at: _b, ...r }: any) => ({
        ...r, step_id: map.get(r.step_id), show_when: remap(r.show_when),
      })));
    }
    return { id: nj.id as string };
  });

export const adminDeleteJourney = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase.from("solution_journeys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
