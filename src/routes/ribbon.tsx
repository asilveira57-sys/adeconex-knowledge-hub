import { createFileRoute } from "@tanstack/react-router";
import { PillarStub } from "@/components/pillar-stub";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/ribbon";
const URL = absoluteUrl(PATH);
const TITLE = "Ribbon para impressora térmica: cera, resina e misto — Adeconex";
const DESCRIPTION =
  "Ribbon (fita térmica) para impressoras de código de barras: cera, resina e misto (wax-resin). Guia técnico, tamanhos, compatibilidade e loja oficial Adeconex.";

export const Route = createFileRoute("/ribbon")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Adeconex", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Ribbon", item: URL },
          ],
        }),
      },
    ],
  }),
  component: RibbonPage,
});

function RibbonPage() {
  return (
    <PillarStub
      eyebrow="Impressão térmica · Ribbon"
      title="Ribbon para impressora de código de barras"
      intro="Ribbon é a fita térmica usada na impressão por transferência térmica — o método que garante etiquetas duráveis, legíveis e resistentes. A Adeconex fornece ribbon cera, resina e misto para todas as impressoras do mercado brasileiro."
      keyPoints={[
        "Ribbon Cera (wax): ideal para etiquetas de papel couché, uso interno, alto giro.",
        "Ribbon Resina (resin): resistência química e mecânica extrema, para BOPP, PET, laboratório e indústria.",
        "Ribbon Misto (wax-resin): equilíbrio entre custo e resistência para logística e cadeia do frio.",
        "Compatibilidade Elgin, Argox, Zebra, Bematech, Honeywell, TSC, Godex, Datamax.",
        "Tabelas de largura e metragem: 110×74, 110×300, 84×74, 60×74, e sob medida.",
      ]}
      keywordFocus={[
        "ribbon",
        "ribbons",
        "ribbon resina",
        "ribbon cera",
        "ribbon misto",
        "ribbon inkanto",
        "ribbon 110x74",
      ]}
      primaryCta={{ to: "/marketplaces", label: "Comprar ribbon" }}
      secondaryCta={{ to: "/contato", label: "Falar com especialista" }}
    />
  );
}
