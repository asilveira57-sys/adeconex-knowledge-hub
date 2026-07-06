import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo técnico — Adeconex" },
      { name: "description", content: "Etiquetas, ribbons, impressoras e automação comercial. Cada produto com ficha técnica completa, compatibilidade, vídeos e downloads." },
      { property: "og:title", content: "Catálogo técnico — Adeconex" },
      { property: "og:description", content: "Páginas de produto com especificação, aplicações, compatibilidade, FAQ e comparativos." },
      { property: "og:url", content: "/catalogo" },
    ],
    links: [{ rel: "canonical", href: "/catalogo" }],
  }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Catálogo técnico"
      title="Cada produto será uma página rica — não uma vitrine."
      description="O catálogo Adeconex está sendo reconstruído como ecossistema técnico: ficha completa, materiais e impressoras compatíveis, vídeos, FAQ, comparativos e múltiplos caminhos de compra."
      features={[
        "Descrição, aplicações e características",
        "Especificações técnicas completas",
        "Materiais e impressoras compatíveis",
        "Vídeos de aplicação real",
        "Downloads: datasheet, manual, ZPL",
        "Produtos relacionados inteligentes",
        "FAQ por produto",
        "Comparativos lado a lado",
        "Botões: orçamento • marketplace • B2B",
      ]}
    />
  ),
});
