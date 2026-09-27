import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export type DownloadRow = Database["public"]["Tables"]["downloads"]["Row"];
export type DownloadListItem = Omit<DownloadRow, "content_html">;

export const DOWNLOAD_KINDS: { value: string; label: string }[] = [
  { value: "driver", label: "Drivers" },
  { value: "software", label: "Softwares" },
  { value: "manual", label: "Manuais" },
  { value: "datasheet", label: "Datasheets" },
  { value: "zpl", label: "Arquivos ZPL" },
  { value: "template", label: "Templates" },
];

export const kindLabel = (k: string) =>
  ({ driver: "Driver", software: "Software", manual: "Manual", datasheet: "Datasheet", zpl: "ZPL", template: "Template" })[k] ?? k;

function publicClient() {
  return createClient<Database>(process.env["SUPABASE_URL"]!, process.env["SUPABASE_PUBLISHABLE_KEY"]!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

const LIST_COLS =
  "id,slug,kind,title,brand,model,version,operating_system,download_url,file_size,summary,image_url,seo_title,seo_description,seo_keywords,legacy_path,is_published,sort_order,published_at,created_at,updated_at";

export const listPublicDownloads = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await publicClient()
    .from("downloads")
    .select(LIST_COLS)
    .eq("is_published", true)
    .order("sort_order")
    .order("brand")
    .order("title");
  if (error) throw new Error(error.message);
  return (data ?? []) as DownloadListItem[];
});

export const getPublicDownload = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(200) }).parse(d))
  .handler(async ({ data }) => {
    const sb = publicClient();
    const { data: item, error } = await sb
      .from("downloads")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!item) return null;
    let q = sb.from("downloads").select("slug,title,kind,brand,model,image_url").eq("is_published", true).neq("id", item.id).limit(6);
    if (item.brand) q = q.eq("brand", item.brand);
    const { data: related } = await q;
    return { item: item as DownloadRow, related: related ?? [] };
  });
