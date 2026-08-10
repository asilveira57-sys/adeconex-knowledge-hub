import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { getHub, hubPath, relatedHubs, type BlogHub } from "@/content/blog-hubs";
import { facetLabel } from "@/content/blog-facets";
import { absoluteUrl } from "@/lib/seo";

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const Route = createFileRoute("/blog/filtro/$hub")({
  loader: ({ params }) => {
    const hub = getHub(params.hub);
    if (!hub) throw notFound();
    return hub;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Filtro não encontrado — Blog Adeconex" }, { name: "robots", content: "noindex" }],
      };
    }
    const url = absoluteUrl(hubPath(loaderData));
    return {
      meta: [
        { title: loaderData.title },
        { name: "description", content: loaderData.description },
        { name: "keywords", content: loaderData.keywords.join(", ") },
        { property: "og:title", content: loaderData.heading },
        { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            name: loaderData.heading,
            description: loaderData.description,
            url,
            isPartOf: { "@type": "Blog", name: "Blog Adeconex", url: absoluteUrl("/blog") },
            mainEntity: {
              "@type": "ItemList",
              numberOfItems: loaderData.posts.length,
              itemListElement: loaderData.posts.map((p, i) => ({
                "@type": "ListItem",
                position: i + 1,
                url: absoluteUrl(`/blog/${p.slug}`),
                name: p.title,
              })),
            },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
              { "@type": "ListItem", position: 3, name: loaderData.heading, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: BlogHubPage,
});

function BlogHubPage() {
  const hub = Route.useLoaderData() as BlogHub;
  const related = relatedHubs(hub);

  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-14 md:py-20">
          <nav className="text-xs text-muted-foreground" aria-label="Trilha de navegação">
            <Link to="/blog" className="underline underline-offset-4 hover:text-foreground">
              Blog
            </Link>
            <span aria-hidden> · </span>
            <span>Filtros</span>
          </nav>
          <p className="eyebrow mt-4">Coleção técnica</p>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight md:text-5xl">
            {hub.heading}
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">{hub.description}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            {hub.facets.map((f) => (
              <span
                key={`${f.key}-${f.value}`}
                className="rounded-full border hairline bg-card px-3.5 py-1.5 text-xs font-medium"
              >
                {facetLabel(f.key, f.value)}
              </span>
            ))}
            <Link
              to="/blog"
              search={Object.fromEntries(hub.facets.map((f) => [f.key, f.value])) as never}
              className="rounded-full border hairline px-3.5 py-1.5 text-xs font-medium underline underline-offset-4"
            >
              Refinar no buscador
            </Link>
          </div>
        </div>
      </section>

      <Section>
        <div className="grid gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-2 lg:grid-cols-3">
          {hub.posts.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group flex flex-col bg-card p-6 transition-colors hover:bg-accent/40"
            >
              <p className="eyebrow">{p.category}</p>
              <h2 className="mt-2 font-display text-lg font-semibold leading-snug tracking-tight">
                {p.title}
              </h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{p.excerpt}</p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(p.date)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {p.readingMinutes} min
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {related.length > 0 && (
        <Section className="border-t hairline bg-surface-2">
          <SectionHeader eyebrow="Combinações relacionadas" title="Continue explorando por filtro" />
          <div className="mt-6 flex flex-wrap gap-2">
            {related.map((h) => (
              <Link
                key={h.slug}
                to="/blog/filtro/$hub"
                params={{ hub: h.slug }}
                className="rounded-full border hairline bg-card px-3.5 py-1.5 text-xs font-medium hover:bg-accent"
              >
                {h.heading.replace("Artigos sobre ", "")}
              </Link>
            ))}
          </div>
          <div className="mt-8">
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Falar com a equipe técnica <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Section>
      )}
    </>
  );
}
