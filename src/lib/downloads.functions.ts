import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
    const { data: pool } = await sb
      .from("downloads")
      .select("slug,title,kind,brand,model,version,image_url,summary")
      .eq("is_published", true)
      .neq("id", item.id)
      .limit(200);
    const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
    const score = (r: NonNullable<typeof pool>[number]) =>
      (item.model && norm(r.model) === norm(item.model) ? 4 : 0) +
      (item.brand && norm(r.brand) === norm(item.brand) ? 2 : 0) +
      (r.kind === item.kind ? 1 : 0);
    const related = (pool ?? [])
      .map((r) => ({ r, s: score(r) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.r.title.localeCompare(b.r.title))
      .slice(0, 6)
      .map((x) => ({ ...x.r, sameModel: x.s >= 4 }));
    return { item: item as DownloadRow, related };
  });

const DOWNLOAD_SEO_SCHEMA = {
  name: "generate_download_seo",
  description: "Gera metadados SEO e um resumo para uma página de download da Adeconex.",
  parameters: {
    type: "object",
    properties: {
      seo_title: { type: "string", description: "Título SEO em português, entre 45 e 60 caracteres" },
      seo_description: { type: "string", description: "Descrição objetiva, entre 120 e 160 caracteres" },
      seo_keywords: { type: "string", description: "De 5 a 8 termos relevantes, separados por vírgula" },
      summary: { type: "string", description: "Resumo claro em uma ou duas frases, com até 220 caracteres" },
    },
    required: ["seo_title", "seo_description", "seo_keywords", "summary"],
  },
};

export const generateDownloadSeo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value) =>
    z.object({
      kind: z.string().min(1).max(40),
      title: z.string().min(2).max(200),
      brand: z.string().max(100).optional(),
      model: z.string().max(100).optional(),
      version: z.string().max(100).optional(),
      operatingSystem: z.string().max(200).optional(),
      currentSummary: z.string().max(1000).optional(),
    }).parse(value),
  )
  .handler(async ({ data, context }) => {
    const { data: isStaff, error: staffError } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
    if (staffError) throw new Error(staffError.message);
    if (!isStaff) throw new Error("Apenas colaboradores podem gerar conteúdo.");

    const apiKey = process.env["LOVABLE_API_KEY"]!;
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você é especialista brasileiro em SEO técnico para impressão térmica. Escreva de forma útil e natural. Não invente compatibilidade, versão, fabricante, sistema operacional ou especificações. É proibido chamar o arquivo de oficial, certificado ou homologado quando isso não estiver expressamente nos dados recebidos. A Adeconex hospeda a página, mas não deve ser apresentada como fabricante do arquivo. O título deve favorecer buscas como driver, software, manual, marca e modelo sem repetição artificial.",
          },
          {
            role: "user",
            content: `Tipo: ${kindLabel(data.kind)}\nNome: ${data.title}\nMarca: ${data.brand || "não informada"}\nModelo: ${data.model || "não informado"}\nVersão: ${data.version || "não informada"}\nSistema: ${data.operatingSystem || "não informado"}\nResumo atual: ${data.currentSummary || "não informado"}`,
          },
        ],
        tools: [{ type: "function", function: DOWNLOAD_SEO_SCHEMA }],
        tool_choice: { type: "function", function: { name: DOWNLOAD_SEO_SCHEMA.name } },
      }),
    });
    if (response.status === 429) throw new Error("Muitas gerações em sequência. Aguarde alguns segundos.");
    if (response.status === 402) throw new Error("Os créditos de IA acabaram.");
    if (!response.ok) throw new Error("Não foi possível gerar o SEO agora.");
    const json = await response.json();
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("A geração não retornou conteúdo.");
    const parsed = JSON.parse(args) as Record<string, unknown>;
    return {
      seo_title: String(parsed.seo_title ?? "").slice(0, 200),
      seo_description: String(parsed.seo_description ?? "").slice(0, 300),
      seo_keywords: String(parsed.seo_keywords ?? "").slice(0, 500),
      summary: String(parsed.summary ?? "").slice(0, 500),
    };
  });
