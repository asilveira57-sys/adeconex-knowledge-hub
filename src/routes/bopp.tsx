import { createFileRoute } from "@tanstack/react-router";
import { PillarStub } from "@/components/pillar-stub";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/bopp";
const URL = absoluteUrl(PATH);
const TITLE = "Etiqueta BOPP: brancas, transparentes e adesivas — Adeconex";
const DESCRIPTION =
  "Etiquetas em BOPP branco e transparente para produtos, cosméticos, alimentos e químicos. Impressão em resina, alta durabilidade. Fábrica Adeconex.";

export const Route = createFileRoute("/bopp")({
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
            { "@type": "ListItem", position: 2, name: "BOPP", item: URL },
          ],
        }),
      },
    ],
  }),
  component: BoppPage,
});

function BoppPage() {
  return (
    <PillarStub
      eyebrow="Etiquetas técnicas · BOPP"
      title="Etiquetas em BOPP branco e transparente"
      intro="BOPP (polipropileno biorientado) é o filme sintético de alta resistência preferido para cosméticos, alimentos, químicos e qualquer produto que precise sobreviver a umidade, atrito e óleo. Impressão em ribbon resina."
      keyPoints={[
        "BOPP branco fosco e brilho — impressão nítida em código de barras.",
        "BOPP transparente para rótulo 'no label look' de cosméticos e bebidas.",
        "Adesivo permanente e removível conforme aplicação.",
        "Tamanhos padrão e sob medida, rolos com mandril 40mm ou 76mm.",
        "Compatível com impressoras térmicas industriais (resina obrigatória).",
      ]}
      keywordFocus={[
        "etiquetas em bopp",
        "etiqueta bopp",
        "bopp branco",
        "bopp transparente",
        "etiqueta rótulo cosmético",
      ]}
      primaryCta={{ to: "/marketplaces", label: "Comprar etiquetas BOPP" }}
      secondaryCta={{ to: "/contato", label: "Orçamento sob medida" }}
    />
  );
}
