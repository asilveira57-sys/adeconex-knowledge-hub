import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isBannerLive, type SiteBanner } from "@/lib/banners.shared";

/** Banners ativos e dentro do período, para o site público. */
export const getActiveBanners = createServerFn({ method: "GET" }).handler(async (): Promise<SiteBanner[]> => {
  try {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data } = await sb.from("site_banners").select("*").eq("active", true).order("sort_order").limit(100);
    return ((data ?? []) as SiteBanner[]).filter((b) => isBannerLive(b));
  } catch {
    return [];
  }
});
