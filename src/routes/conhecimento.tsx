import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/conhecimento")({
  head: () => ({
    meta: [
      { title: "Centro de conhecimento — Adeconex" },
      { name: "description", content: "Portal técnico sobre impressão térmica, etiquetas, ribbons, código de barras, automação comercial e logística." },
      { property: "og:title", content: "Centro de conhecimento — Adeconex" },
      { property: "og:description", content: "Guias, tutoriais, comparativos e boas práticas sobre identificação industrial." },
      { property: "og:url", content: "/conhecimento" },
    ],
    links: [{ rel: "canonical", href: "/conhecimento" }],
  }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Centro de conhecimento"
      title="O maior portal técnico brasileiro sobre identificação industrial."
      description="Estamos estruturando categorias, guias e comparativos otimizados para SEO e mecanismos de IA. Conteúdo útil para indústria, varejo, logística, papelaria e automação."
      features={[
        "Etiquetas — tipos, adesivos, aplicações",
        "Ribbon — cera, cera-resina, resina",
        "Impressoras térmicas e drivers",
        "Automação comercial",
        "Código de barras e GS1",
        "Código de barras e GS1",
        "Logística e WMS",
        "Mercado Livre e marketplaces",
        "Indústria, papelaria, boas práticas",
        "Tutoriais passo a passo",
        "Comparativos técnicos",
        "Guias completos por segmento",
      ]}
    />
  ),
});
