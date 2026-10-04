import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PenLine } from "lucide-react";
import { getPublicLabelType } from "@/lib/label-catalog.functions";
import { sizeLabel, sizeParam, templateToDesign } from "@/lib/labels/catalog-shared";
import { LabelCanvas } from "@/components/labels/label-canvas";
import { Button } from "@/components/ui/button";
import { BASE_URL } from "@/lib/seo";

const typeQuery = (slug: string) =>
  queryOptions({
    queryKey: ["label-type", slug],
    queryFn: () => getPublicLabelType({ data: { slug } }),
    staleTime: 300_000,
  });

export const Route = createFileRoute("/etiquetas/personalizada/$tipo")({
  loader: async ({ context, params }) => {
    const t = await context.queryClient.ensureQueryData(typeQuery(params.tipo));
    if (!t) throw notFound();
    return t;
  },
  head: ({ loaderData: t, params }) => {
    if (!t) return { meta: [{ title: "Etiqueta personalizada | Adeconex" }] };
    const title = t.seo_title || `${t.name} personalizada | Adeconex`;
    const description =
      t.seo_description || t.blog_excerpt || t.short_description || `Crie sua ${t.name.toLowerCase()} no editor online da Adeconex.`;
    const url = `${BASE_URL}/etiquetas/personalizada/${params.tipo}`;
    const image = t.cover_url || t.blog_images[0]?.url;
    const ld = [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: t.blog_title || t.name,
        description,
        dateModified: t.updated_at,
        mainEntityOfPage: url,
        image: image ? [image, ...t.blog_images.map((i) => i.url)] : undefined,
        publisher: { "@type": "Organization", name: "Adeconex" },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Início", item: `${BASE_URL}/` },
          { "@type": "ListItem", position: 2, name: "Etiqueta personalizada", item: `${BASE_URL}/etiquetas/personalizada` },
          { "@type": "ListItem", position: 3, name: t.name, item: url },
        ],
      },
    ];
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(ld) }],
    };
  },
  notFoundComponent: () => (
    <div className="container-page py-20">
      <h1 className="text-2xl font-semibold">Tipo de etiqueta não encontrado</h1>
      <Link to="/etiquetas/personalizada" className="mt-4 inline-block text-primary underline">Ver todos os tipos</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="container-page py-20"><p>Não foi possível carregar esta página agora.</p></div>
  ),
  component: LabelTypePage,
});

function LabelTypePage() {
  const { tipo } = Route.useParams();
  const { data: t } = useSuspenseQuery(typeQuery(tipo));
  if (!t) return null;
  const paragraphs = (t.blog_body ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const tips = (t.blog_tips ?? "").split("\n").map((p) => p.trim()).filter(Boolean);

  return (
    <article className="container-page py-14">
      <nav className="text-xs text-muted-foreground">
        <Link to="/etiquetas/personalizada" className="hover:underline">Etiqueta personalizada</Link> / {t.name}
      </nav>
      <header className="mt-4 grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">{t.blog_title || t.name}</h1>
          {(t.blog_excerpt || t.short_description) && (
            <p className="mt-4 text-lg text-muted-foreground">{t.blog_excerpt || t.short_description}</p>
          )}
          <Button asChild size="lg" className="mt-6">
            <Link to="/etiquetas/editor" search={{ medida: t.sizes[0] ? sizeParam(t.sizes[0]) : undefined }}>
              <PenLine className="h-4 w-4" /> Personalizar esta etiqueta
            </Link>
          </Button>
        </div>
        {t.cover_url && <img src={t.cover_url} alt={t.name} className="w-full rounded-lg border hairline object-cover" />}
      </header>

      <section className="mt-12">
        <h2 className="font-display text-2xl font-semibold">Medidas disponíveis</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {t.sizes.map((s, i) => (
            <Link
              key={i}
              to="/etiquetas/editor"
              search={{ medida: sizeParam(s) }}
              className="rounded-md border hairline bg-card px-4 py-3 text-sm hover:border-primary"
            >
              {sizeLabel(s)}
            </Link>
          ))}
        </div>
      </section>

      {t.templates.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold">Artes prontas para começar</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {t.templates.map((tpl) => {
              const d = templateToDesign(tpl);
              return (
                <Link key={tpl.id} to="/etiquetas/editor" search={{ modelo: tpl.id }} className="rounded-lg border hairline bg-card p-5 hover:border-primary">
                  <div className="flex min-h-[170px] items-center justify-center rounded-md bg-surface-2 p-4">
                    <LabelCanvas design={d} scale={Math.min(300 / d.width_mm, 140 / d.height_mm)} />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{tpl.name}</h3>
                  <p className="text-xs text-muted-foreground">{sizeLabel(tpl)}</p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {(t.usage || paragraphs.length > 0) && (
        <section className="mt-12 max-w-3xl space-y-4">
          <h2 className="font-display text-2xl font-semibold">Para que serve</h2>
          {t.usage && <p>{t.usage}</p>}
          {paragraphs.map((p, i) => <p key={i} className="leading-relaxed">{p}</p>)}
        </section>
      )}

      {tips.length > 0 && (
        <section className="mt-12 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold">Dicas de configuração</h2>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            {tips.map((tip, i) => <li key={i}>{tip}</li>)}
          </ul>
        </section>
      )}

      {t.blog_images.length > 0 && (
        <section className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.blog_images.map((img) => (
            <figure key={img.url}>
              <img src={img.url} alt={img.alt || t.name} loading="lazy" className="w-full rounded-lg border hairline object-cover" />
              {img.alt && <figcaption className="mt-1 text-xs text-muted-foreground">{img.alt}</figcaption>}
            </figure>
          ))}
        </section>
      )}
    </article>
  );
}
