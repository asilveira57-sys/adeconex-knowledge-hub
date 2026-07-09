import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog Adeconex — Notícias e conteúdo do setor" },
      { name: "description", content: "Artigos, notícias e análises sobre impressão térmica, etiquetas, ribbons e identificação industrial." },
      { property: "og:title", content: "Blog Adeconex" },
      { property: "og:description", content: "Conteúdo editorial sobre o setor de identificação industrial e automação." },
      { property: "og:url", content: "/blog" },
    ],
    links: [{ rel: "canonical", href: "/blog" }],
  }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Blog"
      title="CMS próprio preparado para escalar a milhares de artigos."
      description="Editor próprio, SEO completo, relacionamento automático entre artigos e produtos. Conteúdo editorial complementando o Centro de Conhecimento técnico."
      features={[
        "CMS interno com editor rico",
        "Title, description, slug, canonical",
        "Open Graph, Twitter Cards",
        "Schema.org Article",
        "Breadcrumb estruturado",
        "Artigos relacionados automáticos",
        "Relação artigo → produto",
        "Categorias e tags",
        "Sitemap dinâmico",
      ]}
    />
  ),
});
