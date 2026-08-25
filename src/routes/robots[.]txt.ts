import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { BASE_URL } from "@/lib/seo";

const DEFAULT_ROBOTS = `User-agent: *
Allow: /

# Não indexar áreas privadas / autenticadas
Disallow: /b2b
`;

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: async () => {
        let content = DEFAULT_ROBOTS;
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data } = await supabaseAdmin
            .from("site_settings")
            .select("value")
            .eq("key", "robots_txt")
            .maybeSingle();
          const stored = (data?.value as any)?.content;
          if (typeof stored === "string" && stored.trim()) content = stored;
        } catch {
          // fallback para o conteúdo padrão
        }

        if (!/^Sitemap:/m.test(content)) {
          content = `${content.replace(/\s+$/, "")}\n\nSitemap: ${BASE_URL}/sitemap.xml\n`;
        }

        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
