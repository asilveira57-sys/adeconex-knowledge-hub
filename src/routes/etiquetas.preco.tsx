import { createFileRoute } from "@tanstack/react-router";
import { PillarStub } from "@/components/pillar-stub";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/etiquetas/preco";
const URL = absoluteUrl(PATH);
const TITLE = "Etiqueta de preço: personalizada, adesiva e para gôndola — Adeconex";
const DESCRIPTION =
  "Etiqueta de preço personalizada, adesiva e para gôndola. Rolos com picote, tamanhos padrão, impressão térmica e couché. Fábrica Adeconex — pronta entrega e sob medida.";

export const Route = createFileRoute("/etiquetas/preco")({
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
            { "@type": "ListItem", position: 2, name: "Etiquetas", item: absoluteUrl("/etiquetas") },
            { "@type": "ListItem", position: 3, name: "Preço", item: URL },
          ],
        }),
      },
    ],
  }),
  component: EtiquetaPrecoPage,
});

function EtiquetaPrecoPage() {
  return (
    <PillarStub
      eyebrow="Etiquetas · Preço"
      title="Etiqueta de preço para varejo, gôndola e mercado"
      intro="Do supermercado à loja de bairro: a etiqueta de preço Adeconex chega pronta para a sua impressora térmica ou balança, com ou sem personalização, em rolos, folhas e formatos customizados."
      keyPoints={[
        "Etiqueta de preço personalizada com sua marca ou tabela de valores.",
        "Etiqueta para gôndola em papel couché ou térmico.",
        "Etiqueta para balança 40×40, 40×60, 60×40, 58mm e específicos por modelo.",
        "Etiqueta para Mercado Livre 100×150 térmica com adesivo removível.",
        "Rolos com picote calibrado por impressora (Elgin, Argox, Zebra, Bematech, Godex).",
      ]}
      keywordFocus={[
        "etiqueta de preço",
        "etiqueta pra preco",
        "etiqueta de preço personalizada",
        "etiqueta 40x40",
        "etiqueta 50x30",
        "etiqueta 100x50",
        "etiqueta mercado livre",
        "etiqueta gôndola",
      ]}
      primaryCta={{ to: "/marketplaces", label: "Ver etiquetas de preço" }}
      secondaryCta={{ to: "/contato", label: "Pedir amostra" }}
    />
  );
}
