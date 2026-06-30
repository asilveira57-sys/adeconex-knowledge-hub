import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/marketplaces")({
  head: () => ({
    meta: [
      { title: "Marketplaces oficiais — Adeconex" },
      { name: "description", content: "Compre Adeconex no Mercado Livre, Shopee, Amazon, Magalu e outros canais oficiais." },
      { property: "og:title", content: "Marketplaces oficiais — Adeconex" },
      { property: "og:description", content: "Lojas oficiais Adeconex em todos os principais marketplaces brasileiros." },
      { property: "og:url", content: "/marketplaces" },
    ],
    links: [{ rel: "canonical", href: "/marketplaces" }],
  }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Marketplace Hub"
      title="Compre Adeconex onde você já confia."
      description="Página única com todos os canais oficiais de venda. Você escolhe a melhor experiência — frete, conta, prazo, parcelamento. Em breve, integração com listagens em tempo real."
      features={[
        "Loja oficial Mercado Livre",
        "Loja oficial Shopee",
        "Loja oficial Amazon",
        "Loja oficial Magalu",
        "Outros canais regionais",
        "Comparativo de preços por canal",
        "Selo de loja oficial verificada",
        "Direcionamento por produto",
        "Histórico de avaliações por canal",
      ]}
    />
  ),
});
