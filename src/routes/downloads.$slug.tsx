import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, HardDrive } from "lucide-react";
import { getPublicDownload, kindLabel } from "@/lib/downloads.functions";
import { trackEvent } from "@/lib/analytics";
import { BASE_URL } from "@/lib/seo";

const downloadQuery = (slug: string) =>
  queryOptions({
    queryKey: ["public-download", slug],
    queryFn: () => getPublicDownload({ data: { slug } }),
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/downloads/$slug")({
  loader: async ({ context, params }) => {
    const res = await context.queryClient.ensureQueryData(downloadQuery(params.slug));
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData, params }) => {
    const it = loaderData?.item;
    const title = it?.seo_title || (it ? `${it.title} — download e instalação` : "Download");
    const desc = it?.seo_description || it?.summary || "Download e tutorial de instalação.";
    const url = `${BASE_URL}/downloads/${params.slug}`;
    return {
      meta: [
        { title: `${title} | Adeconex` },
        { name: "description", content: desc },
        ...(it?.seo_keywords ? [{ name: "keywords", content: it.seo_keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: it
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                name: it.title,
                applicationCategory: it.kind === "driver" ? "DriverApplication" : "BusinessApplication",
                operatingSystem: it.operating_system ?? "Windows",
                softwareVersion: it.version ?? undefined,
                downloadUrl: it.download_url,
                description: desc,
                offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
                publisher: { "@type": "Organization", name: "Adeconex", url: BASE_URL },
              }),
            },
          ]
        : [],
    };
  },
  errorComponent: () => <div className="container-page py-20">Não foi possível carregar este download.</div>,
  notFoundComponent: () => (
    <div className="container-page py-20">
      <h1 className="text-2xl font-semibold">Download não encontrado</h1>
      <Link to="/downloads" className="mt-4 inline-block text-primary underline">Ver todos os downloads</Link>
    </div>
  ),
  component: DownloadPage,
});

function DownloadPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(downloadQuery(slug));
  if (!data) return null;
  const { item, related } = data;
  // O conteúdo antigo começa com <h1>; a página já tem H1, então rebaixamos.
  const html = (item.content_html ?? "").replace(/<(\/?)h1(\s|>)/gi, "<$1h2$2");

  const onDownload = () =>
    trackEvent("file_download", {
      file_name: item.title,
      download_kind: item.kind,
      brand: item.brand ?? undefined,
      model: item.model ?? undefined,
      link_url: item.download_url,
    });

  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page grid gap-10 py-12 md:grid-cols-[1fr_320px] md:items-center">
          <div>
            <Link to="/downloads" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Central de downloads
            </Link>
            <p className="eyebrow mt-6">{kindLabel(item.kind)}{item.brand ? ` · ${item.brand}` : ""}</p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{item.title}</h1>
            {item.summary ? <p className="mt-3 max-w-2xl text-muted-foreground">{item.summary}</p> : null}
            <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {item.version ? <div><dt className="text-muted-foreground">Versão</dt><dd className="font-medium">{item.version}</dd></div> : null}
              {item.operating_system ? <div><dt className="text-muted-foreground">Sistema</dt><dd className="font-medium">{item.operating_system}</dd></div> : null}
              {item.file_size ? <div><dt className="text-muted-foreground">Tamanho</dt><dd className="font-medium">{item.file_size}</dd></div> : null}
            </dl>
            <a
              href={item.download_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onDownload}
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Baixar gratuitamente
            </a>
          </div>
          <div className="flex aspect-square items-center justify-center rounded-xl border hairline bg-card">
            {item.image_url ? (
              <img src={item.image_url} alt={item.title} className="h-full w-full object-contain p-6" />
            ) : (
              <HardDrive className="h-16 w-16 text-muted-foreground" strokeWidth={1.2} />
            )}
          </div>
        </div>
      </section>

      {html ? (
        <section className="container-page py-12">
          <article
            className="prose prose-neutral max-w-3xl dark:prose-invert prose-headings:font-display prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="container-page border-t hairline py-12">
          <h2 className="text-xl font-semibold">Outros downloads{item.brand ? ` ${item.brand}` : ""}</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {related.map((r) => (
              <Link key={r.slug} to="/downloads/$slug" params={{ slug: r.slug }} className="rounded-full border hairline bg-card px-4 py-2 text-sm hover:bg-accent">
                {r.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
