import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/**
 * Central de SEO & Tracking — server functions (thin wrappers).
 * Toda a lógica vive em seo-central.server.ts.
 */

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
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

export const getSeoCentralDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildDashboard } = await import("@/lib/seo-central.server");
    return buildDashboard(supabaseAdmin);
  });

export const getSiteSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchSettingsMap } = await import("@/lib/seo-central.server");
    return fetchSettingsMap(supabaseAdmin);
  });

export const updateSiteSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { key: string; value: unknown }) =>
    z.object({ key: z.string().min(1).max(80), value: z.record(z.string(), z.any()) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.key === "robots_txt") {
      const { validateRobotsTxt } = await import("@/lib/seo-central.server");
      const content = String((data.value as any).content ?? "");
      const problem = validateRobotsTxt(content);
      if (problem) throw new Error(problem);
    }

    const { data: existing } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", data.key)
      .maybeSingle();

    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: data.key, value: data.value, updated_by: context.userId, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("settings_history").insert({
      setting_key: data.key,
      changed_by: context.userId,
      old_value: existing?.value ?? null,
      new_value: data.value,
    });

    return { ok: true as const };
  });

export const getSettingsHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data?: { key?: string }) =>
    z.object({ key: z.string().optional() }).optional().parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("settings_history")
      .select("id, setting_key, changed_by, old_value, new_value, created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data?.key) q = q.eq("setting_key", data.key);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { history: rows ?? [] };
  });

export const listRedirectsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("legacy_redirects")
      .select("id, old_url, new_url, http_status, is_active, hits, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { redirects: data ?? [] };
  });

export const upsertRedirectAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id?: string; old_url: string; new_url: string; http_status?: number; notes?: string }) =>
    z
      .object({
        id: z.string().uuid().optional(),
        old_url: z.string().min(1).max(500),
        new_url: z.string().min(1).max(500),
        http_status: z.union([z.literal(301), z.literal(302)]).optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { detectRedirectLoop, normalizePath } = await import("@/lib/seo-central.server");

    const { data: existing, error: listErr } = await supabaseAdmin
      .from("legacy_redirects")
      .select("id, old_url, new_url, is_active");
    if (listErr) throw new Error(listErr.message);

    const others = (existing ?? []).filter((r) => r.id !== data.id);
    const loop = detectRedirectLoop(data.old_url, data.new_url, others);
    if (loop) throw new Error(loop);

    const payload = {
      old_url: normalizePath(data.old_url),
      new_url: normalizePath(data.new_url),
      http_status: data.http_status ?? 301,
      notes: data.notes ?? null,
      is_active: true,
      entity_type: "page" as const,
      updated_at: new Date().toISOString(),
    };

    const q = data.id
      ? supabaseAdmin.from("legacy_redirects").update(payload).eq("id", data.id).select("id").single()
      : supabaseAdmin.from("legacy_redirects").insert(payload).select("id").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const toggleRedirectAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string; is_active: boolean }) =>
    z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("legacy_redirects")
      .update({ is_active: data.is_active, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const deleteRedirectAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("legacy_redirects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/** Config pública e não sensível para o runtime do site (gtag/GTM/Pixel/verificação). */
export const getPublicTrackingConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { buildPublicTrackingConfig, fetchSettingsMap } = await import("@/lib/seo-central.server");
  const settings = await fetchSettingsMap(supabaseAdmin);
  return buildPublicTrackingConfig(settings);
});

export const listSeoPagesAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("seo_pages")
      .select(
        "id, entity_type, path, title, meta_description, keywords, canonical_url, indexable, robots_meta, og_title, og_description, og_image, twitter_title, twitter_description, twitter_image, seo_priority, internal_notes, is_published, updated_at",
      )
      .eq("entity_type", "page")
      .order("path", { ascending: true });
    if (error) throw new Error(error.message);
    return { pages: data ?? [] };
  });

const seoPageSchema = z.object({
  id: z.string().uuid().optional(),
  path: z.string().min(1).max(500),
  title: z.string().min(1).max(200),
  meta_description: z.string().max(400).nullable().optional(),
  keywords: z.string().max(400).nullable().optional(),
  canonical_url: z.string().max(500).nullable().optional(),
  indexable: z.boolean(),
  robots_meta: z.enum(["index,follow", "index,nofollow", "noindex,follow", "noindex,nofollow"]),
  og_title: z.string().max(200).nullable().optional(),
  og_description: z.string().max(400).nullable().optional(),
  og_image: z.string().max(500).nullable().optional(),
  twitter_title: z.string().max(200).nullable().optional(),
  twitter_description: z.string().max(400).nullable().optional(),
  twitter_image: z.string().max(500).nullable().optional(),
  seo_priority: z.number().min(0).max(1).nullable().optional(),
  internal_notes: z.string().max(1000).nullable().optional(),
});

export const upsertSeoPageAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => seoPageSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const payload = {
      ...rest,
      entity_type: "page" as const,
      is_published: true,
      updated_at: new Date().toISOString(),
    };
    const q = id
      ? supabaseAdmin.from("seo_pages").update(payload).eq("id", id).select("id").single()
      : supabaseAdmin.from("seo_pages").insert(payload).select("id").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteSeoPageAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("seo_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
