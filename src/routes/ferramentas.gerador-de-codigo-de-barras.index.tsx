import { createFileRoute } from "@tanstack/react-router";
import { BarcodeToolPage, BARCODE_FAQ, TOOL_URL } from "@/components/tools/barcode-tool-page";
import { absoluteUrl } from "@/lib/seo";

const TITLE = "Gerador de Código de Barras Grátis (EAN-13, GS1-128, ITF-14) | Adeconex";
const DESCRIPTION =
  "Crie código de barras grátis online: EAN-13, EAN-8, UPC-A, Code 128, Code 39, ITF-14, GS1-128, SSCC, QR Code, GS1 DataMatrix e PDF417. Baixe em SVG, PNG e PDF A4.";

export const Route = createFileRoute("/ferramentas/gerador-de-codigo-de-barras/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: TOOL_URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: TOOL_URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Gerador de Código de Barras Adeconex",
          url: TOOL_URL,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: 0, priceCurrency: "BRL" },
          publisher: { "@type": "Organization", name: "Adeconex", url: absoluteUrl("/") },
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
            { "@type": "ListItem", position: 3, name: "Gerador de Código de Barras", item: TOOL_URL },
          ],
        }),
      },
    ],
  }),
  component: () => (
    <BarcodeToolPage
      heading="Gerador de Código de Barras Grátis"
      intro="Gere EAN-13, EAN-8, UPC-A, Code 128, Code 39, ITF-14, GS1-128, SSCC, QR Code, GS1 DataMatrix e PDF417 direto no navegador. Configure em milímetros, valide o dígito verificador e baixe em SVG, PNG por DPI ou folha A4 pronta para imprimir."
    />
  ),
});
