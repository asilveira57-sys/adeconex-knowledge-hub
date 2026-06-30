import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Central de downloads — Adeconex" },
      { name: "description", content: "Drivers, softwares, manuais, datasheets, templates e arquivos ZPL para impressoras térmicas e equipamentos." },
      { property: "og:title", content: "Central de downloads — Adeconex" },
      { property: "og:description", content: "Acervo técnico organizado para profissionais de impressão térmica e automação." },
      { property: "og:url", content: "/downloads" },
    ],
    links: [{ rel: "canonical", href: "/downloads" }],
  }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Central de downloads"
      title="Drivers, manuais, datasheets e arquivos técnicos em um só lugar."
      description="Estamos organizando o acervo técnico Adeconex em uma central versionada, organizada por fabricante, modelo e categoria."
      features={[
        "Drivers de impressoras térmicas",
        "Softwares utilitários",
        "Templates de etiqueta",
        "Manuais técnicos",
        "Datasheets de produtos",
        "Arquivos ZPL prontos",
        "Documentação por fabricante",
        "Versionamento e changelog",
        "Busca por modelo e categoria",
      ]}
    />
  ),
});
