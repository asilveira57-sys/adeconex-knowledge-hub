import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { INSTITUTIONAL_PAGES, type InstPage } from "@/content/institutional-pages";

/** Campos editáveis pelo admin; o restante (rota, grupo) vem do código. */
export type InstOverride = Partial<Pick<InstPage, "title" | "h1" | "description" | "intro" | "updated" | "draftNotice" | "sections" | "links">>;

export function mergeInstitutional(key: string, override: InstOverride | null | undefined): InstPage {
  const base = INSTITUTIONAL_PAGES[key];
  if (!override) return base;
  return { ...base, ...override, path: base.path, group: base.group };
}

export const getInstitutionalPage = createServerFn({ method: "GET" })
  .inputValidator((key: string) => {
    if (!INSTITUTIONAL_PAGES[key]) throw new Error("Página inválida");
    return key;
  })
  .handler(async ({ data: key }) => {
    try {
      const sbKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
      const sb = createClient<Database>(process.env["SUPABASE_URL"]!, sbKey, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
        global: {
          fetch: (input, init) => {
            const h = new Headers(init?.headers);
            if (sbKey.startsWith("sb_") && h.get("Authorization") === `Bearer ${sbKey}`) h.delete("Authorization");
            h.set("apikey", sbKey);
            return fetch(input, { ...init, headers: h });
          },
        },
      });
      const { data } = await sb.from("institutional_pages").select("content").eq("key", key).maybeSingle();
      return mergeInstitutional(key, (data?.content as InstOverride) ?? null);
    } catch {
      return INSTITUTIONAL_PAGES[key];
    }
  });
