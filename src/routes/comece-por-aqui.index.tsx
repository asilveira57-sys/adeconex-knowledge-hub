import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, Compass } from "lucide-react";
import { getSolutionCategories } from "@/lib/solutions.functions";
import { absoluteUrl } from "@/lib/seo";
import { DISCLAIMER } from "@/lib/solutions.shared";

const catsQuery = queryOptions({ queryKey: ["solution-categories"], queryFn: () => getSolutionCategories() });

const TITLE = "Comece por aqui — Encontre a solução de impressão ideal | Adeconex";
const DESC = "Conte o que você precisa produzir e veja quais equipamentos, suprimentos e acessórios podem fazer parte da sua solução de impressão.";

export const Route = createFileRoute("/comece-por-aqui/")({
  head: () => ({
    meta: [
      { title: TITLE }, { name: "description", content: DESC },
      { property: "og:title", content: TITLE }, { property: "og:description", content: DESC },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/comece-por-aqui") }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify({
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Comece por aqui", item: absoluteUrl("/comece-por-aqui") },
      ] }) }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catsQuery),
  errorComponent: () => <div className="container-page py-20">Não foi possível carregar as soluções agora.</div>,
  notFoundComponent: () => <div className="container-page py-20">Página não encontrada.</div>,
  component: ComecePage,
});

function ComecePage() {
  const { data: cats } = useSuspenseQuery(catsQuery);
  return (
    <main>
      <section className="border-b bg-muted/30">
        <div className="container-page py-16">
          <p className="eyebrow">Comece por aqui</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-5xl">Encontre a solução de impressão ideal para o seu negócio</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{DESC}</p>
        </div>
      </section>
      <section className="container-page py-12">
        {cats.length === 0 ? (
          <div className="rounded-xl border bg-card p-10 text-center">
            <Compass className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <p className="mt-3 font-medium">Estamos preparando as soluções.</p>
            <p className="mt-1 text-sm text-muted-foreground">Enquanto isso, fale com a nossa equipe ou veja o catálogo.</p>
            <div className="mt-4 flex justify-center gap-3">
              <Link to="/contato" className="text-sm font-medium text-primary underline">Falar com a equipe</Link>
              <Link to="/catalogo" className="text-sm font-medium text-primary underline">Ver catálogo</Link>
            </div>
          </div>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cats.map((c) => {
              const first = c.journeys[0];
              const inner = (
                <>
                  {c.cover_url ? <img src={c.cover_url} alt={c.cover_alt ?? c.name} loading="lazy" className="aspect-[16/9] w-full object-cover" />
                    : <div className="flex aspect-[16/9] items-center justify-center bg-primary/5"><Compass className="h-10 w-10 text-primary/60" aria-hidden="true" /></div>}
                  <div className="flex flex-1 flex-col p-5">
                    <h2 className="text-lg font-semibold">{c.name}</h2>
                    {c.short_description ? <p className="mt-2 text-sm text-muted-foreground">{c.short_description}</p> : null}
                    <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary">
                      {first ? "Começar" : "Em breve"} {first ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
                    </span>
                  </div>
                </>
              );
              return (
                <li key={c.id} className="flex">
                  {first ? (
                    <Link to="/comece-por-aqui/$slug" params={{ slug: first.slug }} className="flex w-full flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-primary">{inner}</Link>
                  ) : <div className="flex w-full flex-col overflow-hidden rounded-xl border bg-card opacity-80">{inner}</div>}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-10 text-xs text-muted-foreground">{DISCLAIMER}</p>
      </section>
    </main>
  );
}
