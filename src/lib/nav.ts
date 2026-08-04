export type NavItem = {
  to: string;
  label: string;
  description?: string;
};

export const primaryNav: NavItem[] = [
  { to: "/empresa", label: "Empresa", description: "Quem somos, fábrica e equipe" },
  { to: "/catalogo", label: "Catálogo", description: "Produtos técnicos com ficha completa" },
  { to: "/conhecimento", label: "Conhecimento", description: "Guias, tutoriais e comparativos" },
  { to: "/ferramentas", label: "Ferramentas", description: "Calculadoras e geradores gratuitos" },
  { to: "/downloads", label: "Downloads", description: "Drivers, manuais, datasheets, ZPL" },
  { to: "/marketplaces", label: "Marketplaces", description: "Compre nos canais oficiais" },
];

export const secondaryNav: NavItem[] = [
  { to: "/blog", label: "Blog" },
  { to: "/avaliacoes", label: "Avaliações" },
  
  { to: "/contato", label: "Contato" },
];
