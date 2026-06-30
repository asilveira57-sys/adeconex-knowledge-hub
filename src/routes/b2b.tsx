import { createFileRoute } from "@tanstack/react-router";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/b2b")({
  head: () => ({
    meta: [
      { title: "Área B2B — Adeconex" },
      { name: "description", content: "Portal exclusivo para clientes B2B Adeconex: tabela personalizada, pedidos rápidos, histórico e reposição." },
      { property: "og:title", content: "Área B2B — Adeconex" },
      { property: "og:description", content: "Pedidos recorrentes, tabelas personalizadas, histórico e arquivos técnicos." },
      { property: "og:url", content: "/b2b" },
    ],
    links: [{ rel: "canonical", href: "/b2b" }],
  }),
  component: () => (
    <ModulePlaceholder
      eyebrow="Área B2B"
      title="Portal exclusivo para clientes corporativos."
      description="Acesso autenticado com tabelas personalizadas, pedidos recorrentes, histórico, arquivos e reposição inteligente. Em construção como parte da Fase 1."
      features={[
        "Login exclusivo de clientes",
        "Tabela de preços personalizada",
        "Pedidos rápidos por SKU",
        "Histórico completo",
        "Arquivos técnicos da conta",
        "Reposição automática",
        "Produtos recorrentes",
        "Solicitação de orçamento integrada",
        "Aprovação de pedidos multi-usuário",
      ]}
      primaryCta={{ to: "/contato", label: "Cadastrar empresa" }}
    />
  ),
});
