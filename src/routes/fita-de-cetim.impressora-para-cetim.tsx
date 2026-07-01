import { createFileRoute } from "@tanstack/react-router";
import { PillarStub } from "@/components/pillar-stub";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/fita-de-cetim/impressora-para-cetim";
const URL = absoluteUrl(PATH);
const TITLE = "Impressora para fita de cetim: kit completo — Adeconex";
const DESCRIPTION =
  "Impressora para fita de cetim personalizada com ribbon, gabarito e software. Solução Adeconex pronta para lojas, floriculturas e brindes corporativos.";

export const Route = createFileRoute("/fita-de-cetim/impressora-para-cetim")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "product" },
      { property: "og:url", content: URL },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: ImpressoraCetimPage,
});

function ImpressoraCetimPage() {
  return (
    <PillarStub
      eyebrow="Fita de cetim · Impressora"
      title="Impressora para fita de cetim personalizada"
      intro="A solução Adeconex para produzir fita de cetim personalizada dentro do seu negócio. Impressora térmica dedicada, gabarito de alinhamento, ribbon compatível e treinamento de uso."
      keyPoints={[
        "Impressão nítida em fita de cetim de 10mm a 38mm.",
        "Gabarito garante alinhamento perfeito da fita no cabeçote.",
        "Ribbon dedicado — cores sólidas, metalizadas e temáticas.",
        "Software gratuito para desenho de layouts, textos e logos.",
        "Assistência técnica autorizada em todo o Brasil.",
      ]}
      keywordFocus={[
        "impressora de fita de cetim",
        "impressora para cetim",
        "gabarito para impressora argox",
        "kit fita de cetim",
      ]}
      primaryCta={{ to: "/marketplaces", label: "Comprar kit completo" }}
      secondaryCta={{ to: "/contato", label: "Falar com especialista" }}
    />
  );
}
