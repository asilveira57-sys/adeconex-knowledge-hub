/**
 * Facetas técnicas do blog (tipo de impressora, material, tecnologia e ribbon).
 * Mantidas fora de blog-posts.ts para permitir evolução independente do conteúdo.
 */
import { blogPosts, type BlogPost } from "./blog-posts";

export type FacetGroupKey = "impressora" | "material" | "tecnologia" | "ribbon";

export interface FacetOption {
  value: string;
  label: string;
}

export const FACET_GROUPS: {
  key: FacetGroupKey;
  label: string;
  options: FacetOption[];
}[] = [
  {
    key: "impressora",
    label: "Tipo de impressora",
    options: [
      { value: "desktop", label: "Desktop" },
      { value: "industrial", label: "Industrial" },
      { value: "portatil", label: "Portátil" },
    ],
  },
  {
    key: "material",
    label: "Material",
    options: [
      { value: "couche", label: "Couché" },
      { value: "bopp", label: "BOPP" },
      { value: "termico", label: "Térmico" },
      { value: "cartao", label: "Papel cartão / TAG" },
    ],
  },
  {
    key: "tecnologia",
    label: "Tecnologia",
    options: [
      { value: "transferencia-termica", label: "Transferência térmica" },
      { value: "termica-direta", label: "Térmica direta" },
      { value: "codigo-de-barras", label: "Código de barras" },
    ],
  },
  {
    key: "ribbon",
    label: "Tipo de ribbon",
    options: [
      { value: "cera", label: "Cera" },
      { value: "cera-resina", label: "Cera-resina" },
      { value: "resina", label: "Resina" },
      { value: "sem-ribbon", label: "Sem ribbon" },
    ],
  },
];

export type PostFacets = Partial<Record<FacetGroupKey, string[]>>;

export const POST_FACETS: Record<string, PostFacets> = {
  "ribbon-cera-cera-resina-resina-qual-escolher": {
    impressora: ["desktop", "industrial"],
    material: ["couche", "bopp"],
    tecnologia: ["transferencia-termica"],
    ribbon: ["cera", "cera-resina", "resina"],
  },
  "como-economizar-ribbon": {
    impressora: ["desktop", "industrial"],
    material: ["couche", "bopp"],
    tecnologia: ["transferencia-termica"],
    ribbon: ["cera", "cera-resina", "resina"],
  },
  "tabela-compatibilidade-ribbon-impressora": {
    impressora: ["desktop", "industrial", "portatil"],
    material: ["couche", "bopp"],
    tecnologia: ["transferencia-termica"],
    ribbon: ["cera", "cera-resina", "resina"],
  },
  "impressora-termica-desktop-ou-industrial": {
    impressora: ["desktop", "industrial"],
    material: ["couche", "termico"],
    tecnologia: ["transferencia-termica", "termica-direta"],
    ribbon: ["cera", "sem-ribbon"],
  },
  "etiqueta-couche-bopp-ou-termica-direta": {
    impressora: ["desktop", "industrial"],
    material: ["couche", "bopp", "termico"],
    tecnologia: ["transferencia-termica", "termica-direta"],
    ribbon: ["cera", "resina", "sem-ribbon"],
  },
  "etiqueta-bopp-quando-vale-a-pena": {
    impressora: ["industrial", "desktop"],
    material: ["bopp"],
    tecnologia: ["transferencia-termica"],
    ribbon: ["resina", "cera-resina"],
  },
  "resolver-problemas-impressao-etiquetas": {
    impressora: ["desktop", "industrial"],
    material: ["couche", "bopp", "termico"],
    tecnologia: ["transferencia-termica", "termica-direta"],
    ribbon: ["cera", "cera-resina", "resina"],
  },
  "calcular-quantas-etiquetas-tem-um-rolo": {
    impressora: ["desktop", "industrial"],
    material: ["couche", "termico", "cartao"],
    tecnologia: ["transferencia-termica", "termica-direta"],
    ribbon: ["sem-ribbon"],
  },
  "etiqueta-para-mercado-livre-shopee": {
    impressora: ["desktop", "portatil"],
    material: ["termico", "couche"],
    tecnologia: ["termica-direta", "codigo-de-barras"],
    ribbon: ["sem-ribbon", "cera"],
  },
  "gs1-128-e-boas-praticas-de-codigo-de-barras": {
    impressora: ["desktop", "industrial"],
    material: ["couche", "bopp", "cartao"],
    tecnologia: ["codigo-de-barras", "transferencia-termica"],
    ribbon: ["resina", "cera-resina"],
  },
};

export const facetsOf = (slug: string): PostFacets => POST_FACETS[slug] ?? {};

export const facetLabel = (key: FacetGroupKey, value: string): string =>
  FACET_GROUPS.find((g) => g.key === key)?.options.find((o) => o.value === value)?.label ?? value;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export function searchIndex(post: BlogPost): string {
  return norm(
    [post.title, post.excerpt, post.description, post.category, ...(post.keywords ?? [])].join(" "),
  );
}

export interface BlogFilterState {
  q: string;
  cat: string;
  impressora: string;
  material: string;
  tecnologia: string;
  ribbon: string;
}

export function filterPosts(posts: BlogPost[], f: BlogFilterState): BlogPost[] {
  const q = norm(f.q.trim());
  return posts.filter((p) => {
    if (f.cat && f.cat !== "Todos" && p.category !== f.cat) return false;
    const facets = facetsOf(p.slug);
    for (const g of FACET_GROUPS) {
      const selected = f[g.key];
      if (selected && !(facets[g.key] ?? []).includes(selected)) return false;
    }
    if (q && !searchIndex(p).includes(q)) return false;
    return true;
  });
}

export const countFor = (
  posts: BlogPost[],
  key: FacetGroupKey,
  value: string,
  base: BlogFilterState,
): number => filterPosts(posts, { ...base, [key]: value }).length;

export const allSlugsWithFacets = () => blogPosts.map((p) => p.slug);
