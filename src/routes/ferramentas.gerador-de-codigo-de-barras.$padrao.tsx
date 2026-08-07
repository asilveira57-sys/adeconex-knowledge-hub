import { createFileRoute, notFound } from "@tanstack/react-router";
import { BarcodeToolPage, BARCODE_FAQ, TOOL_PATH } from "@/components/tools/barcode-tool-page";
import { SLUG_TO_SYMBOLOGY, SYMBOLOGY_BY_ID, type SymbologyId } from "@/lib/barcode/symbologies";
import { absoluteUrl } from "@/lib/seo";

export const Route = createFileRoute("/ferramentas/gerador-de-codigo-de-barras/$padrao")({
  loader: ({ params }) => {
    const id = SLUG_TO_SYMBOLOGY[params.padrao];
    if (!id) throw notFound();
    return { id };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Padrão não encontrado — Adeconex" }, { name: "robots", content: "noindex" }] };
    }
    const sym = SYMBOLOGY_BY_ID[loaderData.id];
    const url = absoluteUrl(`${TOOL_PATH}/${params.padrao}`);
    const title = `Gerador de ${sym.label} Grátis Online | Adeconex`;
    const description = `Crie ${sym.label} grátis no navegador: ${sym.usage.toLowerCase()}. Valide o dígito verificador, ajuste em milímetros e baixe em SVG, PNG e PDF A4.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: `Gerador de ${sym.label} Adeconex`,
            url,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description,
            offers: { "@type": "Offer", price: 0, priceCurrency: "BRL" },
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: BARCODE_FAQ.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
              { "@type": "ListItem", position: 2, name: "Ferramentas", item: absoluteUrl("/ferramentas") },
              { "@type": "ListItem", position: 3, name: "Gerador de Código de Barras", item: absoluteUrl(TOOL_PATH) },
              { "@type": "ListItem", position: 4, name: sym.label, item: url },
            ],
          }),
        },
      ],
    };
  },
  component: PadraoPage,
});

function PadraoPage() {
  const { id } = Route.useLoaderData() as { id: SymbologyId };
  const sym = SYMBOLOGY_BY_ID[id];
  return (
    <BarcodeToolPage
      symbology={id}
      crumb={sym.label}
      heading={`Gerador de ${sym.label} Grátis`}
      intro={`${sym.help} Uso típico: ${sym.usage.toLowerCase()}. Configure em milímetros e baixe em SVG vetorial, PNG no DPI da sua impressora térmica ou folha A4 pronta para imprimir.`}
    />
  );
}
