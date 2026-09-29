import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, HardDrive, Search } from "lucide-react";
import { listPublicDownloads, DOWNLOAD_KINDS, kindLabel } from "@/lib/downloads.functions";
import { BASE_URL } from "@/lib/seo";

const downloadsQuery = queryOptions({
  queryKey: ["public-downloads"],
  queryFn: () => listPublicDownloads(),
  staleTime: 5 * 60_000,
});

export const Route = createFileRoute("/downloads/")({
  head: ({ loaderData }) => ({
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: "Central de downloads Adeconex",
              url: `${BASE_URL}/downloads`,
              inLanguage: "pt-BR",
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Início", item: BASE_URL },
                { "@type": "ListItem", position: 2, name: "Downloads", item: `${BASE_URL}/downloads` },
              ],
            },
            {
              "@type": "ItemList",
              itemListElement: ((loaderData ?? []) as { title: string; slug: string }[]).map((d, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: d.title,
                url: `${BASE_URL}/downloads/${d.slug}`,
              })),
            },
          ],
        }),
      },
    ],
    meta: [
      { title: "Drivers e softwares para impressoras térmicas — Downloads Adeconex" },
      { name: "description", content: "Baixe drivers e softwares para impressoras térmicas Zebra, Elgin, Argox, Godex e Zetex, com tutorial de instalação passo a passo." },
      { property: "og:title", content: "Central de downloads Adeconex — drivers e softwares" },
      { property: "og:description", content: "Drivers oficiais, softwares de etiqueta e tutoriais de instalação para impressoras térmicas." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BASE_URL}/downloads` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/downloads` }],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(downloadsQuery),
  errorComponent: () => <div className="container-page py-20">Não foi possível carregar os downloads agora.</div>,
  notFoundComponent: () => <div className="container-page py-20">Página não encontrada.</div>,
  component: DownloadsPage,
});

function DownloadsPage() {
  const { data } = useSuspenseQuery(downloadsQuery);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState("");
  const [kind, setKind] = useState("");

  const brands = useMemo(() => [...new Set(data.map((d) => d.brand).filter(Boolean) as string[])].sort(), [data]);
  const kinds = DOWNLOAD_KINDS.filter((k) => data.some((d) => d.kind === k.value));

  const filtered = data.filter((d) => {
    const hay = `${d.title} ${d.brand ?? ""} ${d.model ?? ""}`.toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!brand || d.brand === brand) && (!kind || d.kind === kind);
  });

  const chip = (active: boolean) =>
    `rounded-full border hairline px-3 py-1.5 text-sm transition-colors ${active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent"}`;

  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-16">
          <p className="eyebrow">Central de downloads</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Drivers e softwares para impressoras térmicas
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
            Downloads gratuitos com tutorial de instalação para Zebra, Elgin, Godex, Zetex e outras marcas.
          </p>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pelo modelo da impressora (ex.: ZD220, L42 Pro)"
            className="w-full rounded-md border hairline bg-background py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className={chip(!kind)} onClick={() => setKind("")}>Todos os tipos</button>
          {kinds.map((k) => (
            <button key={k.value} className={chip(kind === k.value)} onClick={() => setKind(k.value)}>{k.label}</button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button className={chip(!brand)} onClick={() => setBrand("")}>Todas as marcas</button>
          {brands.map((b) => (
            <button key={b} className={chip(brand === b)} onClick={() => setBrand(b)}>{b}</button>
          ))}
        </div>

        <p className="mt-6 text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "resultado" : "resultados"}</p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <Link
              key={d.id}
              to="/downloads/$slug"
              params={{ slug: d.slug }}
              className="group flex flex-col overflow-hidden rounded-xl border hairline bg-card transition-shadow hover:shadow-md"
            >
              <div className="flex aspect-[4/3] items-center justify-center bg-surface-2">
                {d.image_url ? (
                  <img src={d.image_url} alt={d.title} loading="lazy" className="h-full w-full object-contain p-4" />
                ) : (
                  <HardDrive className="h-12 w-12 text-muted-foreground" strokeWidth={1.2} />
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  {kindLabel(d.kind)}{d.brand ? ` · ${d.brand}` : ""}
                </p>
                <h2 className="mt-1 font-semibold group-hover:text-primary">{d.title}</h2>
                <p className="mt-2 text-xs text-muted-foreground">
                  {d.version ? `Versão ${d.version}` : ""}{d.operating_system ? ` · ${d.operating_system}` : ""}
                </p>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-primary">
                  <Download className="h-4 w-4" /> Ver download e instalação
                </span>
              </div>
            </Link>
          ))}
        </div>
        {filtered.length === 0 ? (
          <p className="mt-10 text-sm text-muted-foreground">
            Nenhum download encontrado. <Link to="/contato" className="text-primary underline">Fale com a gente</Link> que ajudamos a achar o driver certo.
          </p>
        ) : null}
      </section>
    </>
  );
}
