import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPermissions } from "./staff.functions";
import { aggregateBannerEvents, type BannerEventRow } from "./banner-report.shared";

export const getBannerReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ from: z.string(), to: z.string(), placement: z.string().optional() }).parse(v))
  .handler(async ({ context, data }) => {
    const perms = await loadPermissions(context);
    if (!perms.isStaff || !(perms.isAdmin || perms.sections.includes("banners"))) throw new Error("Forbidden");
    const db = context.supabase;
    const rows: BannerEventRow[] = [];
    for (let i = 0; i < 200_000; i += 1000) {
      let q = db.from("banner_events").select("banner_id, placement, event_type, created_at")
        .gte("created_at", data.from).lte("created_at", data.to).order("id").range(i, i + 999);
      if (data.placement) q = q.eq("placement", data.placement);
      const { data: page, error } = await q;
      if (error) throw new Error(error.message);
      rows.push(...(page as BannerEventRow[]));
      if (!page || page.length < 1000) break;
    }
    const { data: banners } = await db.from("site_banners").select("id, name, alt, image_desktop_url, active, page_path");
    return { ...aggregateBannerEvents(rows), banners: banners ?? [] };
  });
