import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Download, FileText, HardDrive, Monitor, Tag } from "lucide-react";
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
    const image = it?.image_url
      ? it.image_url.startsWith("http") ? it.image_url : `${BASE_URL}${it.image_url.startsWith("/") ? "" : "/"}${it.image_url}`
      : null;
    return {
      meta: [
        { title: `${title} | Adeconex` },
        { name: "description", content: desc },
        ...(it?.seo_keywords ? [{ name: "keywords", content: it.seo_keywords }] : []),
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: it
        ? [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": ["driver", "software"].includes(it.kind) ? "SoftwareApplication" : "DigitalDocument",
                    name: it.title,
                    ...(it.kind === "driver" || it.kind === "software" ? {
                      applicationCategory: it.kind === "driver" ? "DriverApplication" : "BusinessApplication",
                      operatingSystem: it.operating_system ?? undefined,
                      softwareVersion: it.version ?? undefined,
                      offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
                    } : {}),
                    url,
                    downloadUrl: it.download_url,
                    description: desc,
                    image: image ?? undefined,
                    publisher: { "@type": "Organization", name: "Adeconex", url: BASE_URL },
                  },
                  {
                    "@type": "BreadcrumbList",
                    itemListElement: [
                      { "@type": "ListItem", position: 1, name: "Início", item: BASE_URL },
                      { "@type": "ListItem", position: 2, name: "Downloads", item: `${BASE_URL}/downloads` },
                      { "@type": "ListItem", position: 3, name: it.title, item: url },
                    ],
                  },
                ],
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
            <dl className="mt-6 grid max-w-2xl gap-3 text-sm sm:grid-cols-3">
              {item.version ? <div className="flex items-start gap-2"><Tag className="mt-0.5 h-4 w-4 text-primary" /><div><dt className="text-muted-foreground">Versão</dt><dd className="font-medium">{item.version}</dd></div></div> : null}
              {item.operating_system ? <div className="flex items-start gap-2"><Monitor className="mt-0.5 h-4 w-4 text-primary" /><div><dt className="text-muted-foreground">Compatibilidade</dt><dd className="font-medium">{item.operating_system}</dd></div></div> : null}
              {item.file_size ? <div className="flex items-start gap-2"><FileText className="mt-0.5 h-4 w-4 text-primary" /><div><dt className="text-muted-foreground">Tamanho</dt><dd className="font-medium">{item.file_size}</dd></div></div> : null}
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

      <section className="border-b hairline">
        <div className="container-page grid gap-4 py-6 text-sm sm:grid-cols-3">
          <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Download gratuito</p>
          <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Instruções em português</p>
          <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Página revisada pela Adeconex</p>
        </div>
      </section>

      {html ? (
        <section className="container-page py-12">
          <article
            className="download-content max-w-3xl"
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
