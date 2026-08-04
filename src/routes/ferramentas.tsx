import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/ferramentas")({
  head: () => ({
    meta: [
      { title: "Ferramentas gratuitas — Adeconex" },
      { name: "description", content: "Calculadoras, geradores e simuladores gratuitos para impressão térmica, etiquetas e código de barras." },
      { property: "og:title", content: "Ferramentas gratuitas — Adeconex" },
      { property: "og:description", content: "QR Code, código de barras, calculadora de ribbon, gerador ZPL, validador GS1 e mais." },
      { property: "og:url", content: "/ferramentas" },
    ],
    links: [{ rel: "canonical", href: "/ferramentas" }],
  }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Ferramentas gratuitas"
      title="Biblioteca de calculadoras e geradores — sem login."
      description="Cada ferramenta terá página própria otimizada para SEO. O objetivo é entregar valor real ao mercado: economizar tempo e evitar erros de especificação."
      links={[{ to: "/gerador-qrcode", label: "Gerador de QR Code" }]}
      features={[
        "Gerador de QR Code (PNG / SVG)",
        "Gerador de Código de Barras (EAN, Code 128, GS1)",
        "Calculadora de Ribbon (metragem por rolo)",
        "Calculadora de Etiquetas por Rolo",
        "Calculadora de Consumo mensal",
        "Conversores (unidades, dpi)",
        "Gerador ZPL com preview",
        "Validador GS1",
        "Simuladores de aplicação",
      ]}
    />
  ),
});
