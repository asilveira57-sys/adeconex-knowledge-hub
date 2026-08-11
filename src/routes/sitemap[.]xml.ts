import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { BASE_URL } from "@/lib/seo";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          // Institucional / plataforma
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/empresa", changefreq: "monthly", priority: "0.7" },
          { path: "/contato", changefreq: "monthly", priority: "0.6" },

          // Pillars SEO preservadas do site antigo
          { path: "/ribbon", changefreq: "weekly", priority: "0.95" },
          { path: "/etiquetas/preco", changefreq: "weekly", priority: "0.95" },
          { path: "/bopp", changefreq: "weekly", priority: "0.9" },
          { path: "/fita-de-cetim", changefreq: "weekly", priority: "0.85" },
          { path: "/fita-de-cetim/impressora-para-cetim", changefreq: "weekly", priority: "0.85" },
          { path: "/brindes", changefreq: "monthly", priority: "0.7" },
          { path: "/brindes/agenda-personalizada", changefreq: "monthly", priority: "0.75" },

          // Módulos da plataforma
          { path: "/catalogo", changefreq: "weekly", priority: "0.9" },
          { path: "/conhecimento", changefreq: "weekly", priority: "0.85" },
          { path: "/ferramentas", changefreq: "weekly", priority: "0.8" },
          { path: "/gerador-qrcode", changefreq: "monthly", priority: "0.85" },
          { path: "/ferramentas/gerador-de-codigo-de-barras", changefreq: "monthly", priority: "0.9" },
          ...[
            "ean-13", "ean-8", "code-128", "itf-14", "gs1-128",
            "sscc", "code-39", "qr-code", "gs1-datamatrix",
          ].map((slug) => ({
            path: `/ferramentas/gerador-de-codigo-de-barras/${slug}`,
            changefreq: "monthly" as const,
            priority: "0.8",
          })),
          { path: "/ferramentas/gerador-zpl", changefreq: "monthly", priority: "0.85" },
          { path: "/downloads", changefreq: "weekly", priority: "0.7" },
          { path: "/marketplaces", changefreq: "monthly", priority: "0.8" },
          { path: "/blog", changefreq: "daily", priority: "0.8" },
          ...(await import("@/content/blog-posts")).blogPosts.map((p) => ({
            path: `/blog/${p.slug}`,
            changefreq: "monthly" as const,
            priority: "0.7",
          })),
          ...(await import("@/content/blog-hubs")).BLOG_HUBS.flatMap((h) => {
            const totalPages = Math.max(1, Math.ceil(h.posts.length / 6));
            return Array.from({ length: totalPages }, (_, i) => ({
              path: `/blog/filtro/${h.slug}${i > 0 ? `?page=${i + 1}` : ""}`,
              changefreq: "weekly" as const,
              priority: i > 0 ? "0.5" : h.facets.length === 1 ? "0.75" : "0.65",
            }));
          }),

          
          
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
