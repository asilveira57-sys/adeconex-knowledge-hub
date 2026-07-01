import { createFileRoute } from "@tanstack/react-router";
import { PillarStub } from "@/components/pillar-stub";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/fita-de-cetim";
const URL = absoluteUrl(PATH);
const TITLE = "Fita de cetim personalizada com impressão — Adeconex";
const DESCRIPTION =
  "Fita de cetim personalizada com impressão colorida e metalizada. Impressora dedicada, gabaritos, ribbon próprio. Guia completo e loja oficial Adeconex.";

export const Route = createFileRoute("/fita-de-cetim/")({
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
  }),
  component: FitaCetimPage,
});

function FitaCetimPage() {
  return (
    <PillarStub
      eyebrow="Personalização · Fita de cetim"
      title="Fita de cetim personalizada com impressão"
      intro="Presentes, embalagens, moda e brindes ganham identidade com fita de cetim impressa. A Adeconex fornece o rolo, a impressora, o ribbon e o gabarito — solução completa para quem quer produzir internamente."
      keyPoints={[
        "Fita de cetim com impressão colorida e metalizada.",
        "Kit completo: impressora + ribbon + gabarito + rolo de fita.",
        "Gabaritos compatíveis com impressoras Argox e similares.",
        "Larguras: 10mm, 15mm, 22mm, 25mm, 38mm e sob medida.",
        "Ideal para lojas de presentes, floriculturas, e-commerce e brindes corporativos.",
      ]}
      keywordFocus={[
        "fita de cetim",
        "fita de cetim personalizada",
        "impressora de fita de cetim",
        "gabarito para impressão",
      ]}
      primaryCta={{ to: "/fita-de-cetim/impressora-para-cetim", label: "Ver impressora" }}
      secondaryCta={{ to: "/contato", label: "Solicitar orçamento" }}
    />
  );
}
