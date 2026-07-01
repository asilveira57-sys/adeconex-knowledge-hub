import { createFileRoute } from "@tanstack/react-router";
import { PillarStub } from "@/components/pillar-stub";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/brindes/agenda-personalizada";
const URL = absoluteUrl(PATH);
const TITLE = "Agenda personalizada corporativa 2026 — Adeconex";
const DESCRIPTION =
  "Agenda personalizada corporativa com sua marca: capas, miolo, dourações e acabamentos premium. Produção Adeconex para empresas e datas comemorativas.";

export const Route = createFileRoute("/brindes/agenda-personalizada")({
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
  component: AgendaPersonalizadaPage,
});

function AgendaPersonalizadaPage() {
  return (
    <PillarStub
      eyebrow="Brindes · Agenda"
      title="Agenda personalizada corporativa"
      intro="Presente corporativo clássico e de alto uso diário. A Adeconex personaliza agendas com capa em couro sintético, tela, hot-stamping dourado ou prateado e miolo customizável."
      keyPoints={[
        "Capa personalizada com sua marca em relevo, silk ou hot-stamping.",
        "Miolo semanal, mensal ou executivo — com ou sem calendário personalizado.",
        "Elástico, marca-página e bolso interno opcionais.",
        "Tiragens a partir de 50 unidades.",
        "Entregas para todo o Brasil.",
      ]}
      keywordFocus={[
        "agenda personalizada",
        "agenda corporativa",
        "agenda brinde",
        "agenda com logo",
      ]}
      primaryCta={{ to: "/contato", label: "Solicitar orçamento" }}
      secondaryCta={{ to: "/marketplaces", label: "Ver na loja oficial" }}
    />
  );
}
