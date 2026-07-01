import { createFileRoute } from "@tanstack/react-router";
import { PillarStub } from "@/components/pillar-stub";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/brindes";
const URL = absoluteUrl(PATH);
const TITLE = "Brindes personalizados corporativos — Adeconex";
const DESCRIPTION =
  "Brindes personalizados corporativos: agendas, canetas, kits e itens promocionais com impressão sob medida. Adeconex — desde 2003.";

export const Route = createFileRoute("/brindes/")({
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
  component: BrindesPage,
});

function BrindesPage() {
  return (
    <PillarStub
      eyebrow="Brindes corporativos"
      title="Brindes personalizados para sua empresa"
      intro="Fortaleça sua marca com brindes que geram uso diário. A Adeconex produz e personaliza kits corporativos com curadoria técnica e prazo confiável."
      keyPoints={[
        "Agendas personalizadas para o ano vigente.",
        "Kits corporativos, eventos e datas comemorativas.",
        "Personalização em silk, tampografia e laser.",
        "Sob medida para pequenas e grandes tiragens.",
      ]}
      keywordFocus={[
        "brindes personalizados",
        "agenda personalizada",
        "brindes corporativos",
      ]}
      primaryCta={{ to: "/brindes/agenda-personalizada", label: "Ver agenda personalizada" }}
      secondaryCta={{ to: "/contato", label: "Solicitar orçamento" }}
    />
  );
}
