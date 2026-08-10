/**
 * Hubs indexáveis do blog: cada combinação relevante de filtros vira uma URL
 * própria (/blog/filtro/{hub}) com Title, Description, Canonical e JSON-LD
 * gerados automaticamente a partir das facetas e dos posts correspondentes.
 */
import { blogPosts, type BlogPost } from "./blog-posts";
import {
  FACET_GROUPS,
  facetLabel,
  filterPosts,
  type BlogFilterState,
  type FacetGroupKey,
} from "./blog-facets";

export interface HubFacet {
  key: FacetGroupKey;
  value: string;
}

export interface BlogHub {
  slug: string;
  facets: HubFacet[];
  heading: string;
  title: string;
  description: string;
  keywords: string[];
  posts: BlogPost[];
}

const MIN_SINGLE = 2;
const MIN_PAIR = 3;

/** Pares de grupos que fazem sentido editorial/comercial combinar. */
const PAIR_GROUPS: [FacetGroupKey, FacetGroupKey][] = [
  ["impressora", "ribbon"],
  ["impressora", "material"],
  ["material", "ribbon"],
  ["material", "tecnologia"],
  ["tecnologia", "ribbon"],
];

const GROUP_PHRASE: Record<FacetGroupKey, string> = {
  impressora: "impressora",
  material: "material",
  tecnologia: "tecnologia",
  ribbon: "ribbon",
};

const baseState = (facets: HubFacet[]): BlogFilterState => {
  const state: BlogFilterState = {
    q: "",
    cat: "Todos",
    impressora: "",
    material: "",
    tecnologia: "",
    ribbon: "",
  };
  for (const f of facets) state[f.key] = f.value;
  return state;
};

const hubSlug = (facets: HubFacet[]) =>
  facets.map((f) => `${f.key}-${f.value}`).join("--");

const phraseOf = (f: HubFacet) =>
  f.key === "ribbon"
    ? `ribbon ${facetLabel(f.key, f.value).toLowerCase()}`
    : f.key === "impressora"
      ? `impressora ${facetLabel(f.key, f.value).toLowerCase()}`
      : facetLabel(f.key, f.value);

function buildHub(facets: HubFacet[]): BlogHub | null {
  const state = baseState(facets);
  const posts = filterPosts(blogPosts, state).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const min = facets.length === 1 ? MIN_SINGLE : MIN_PAIR;
  if (posts.length < min) return null;

  const phrases = facets.map(phraseOf);
  const combo = phrases.join(" + ");
  const heading = `Artigos sobre ${combo}`;
  const title = `${combo.charAt(0).toUpperCase()}${combo.slice(1)} — guias técnicos | Blog Adeconex`;
  const description = `${posts.length} ${posts.length === 1 ? "artigo técnico" : "artigos técnicos"} sobre ${combo}: compatibilidade, escolha de insumos, ajustes de impressão e redução de custo por etiqueta.`;

  return {
    slug: hubSlug(facets),
    facets,
    heading,
    title: title.slice(0, 70),
    description: description.slice(0, 158),
    keywords: [
      ...phrases,
      ...facets.map((f) => `${GROUP_PHRASE[f.key]} ${facetLabel(f.key, f.value).toLowerCase()}`),
      "etiquetas",
      "impressão térmica",
    ],
    posts,
  };
}

function buildAll(): BlogHub[] {
  const hubs: BlogHub[] = [];

  for (const g of FACET_GROUPS) {
    for (const o of g.options) {
      const hub = buildHub([{ key: g.key, value: o.value }]);
      if (hub) hubs.push(hub);
    }
  }

  for (const [a, b] of PAIR_GROUPS) {
    const ga = FACET_GROUPS.find((g) => g.key === a)!;
    const gb = FACET_GROUPS.find((g) => g.key === b)!;
    for (const oa of ga.options) {
      for (const ob of gb.options) {
        const hub = buildHub([
          { key: a, value: oa.value },
          { key: b, value: ob.value },
        ]);
        if (hub) hubs.push(hub);
      }
    }
  }

  return hubs;
}

export const BLOG_HUBS: BlogHub[] = buildAll();

export const getHub = (slug: string) => BLOG_HUBS.find((h) => h.slug === slug);

export const hubPath = (hub: Pick<BlogHub, "slug">) => `/blog/filtro/${hub.slug}`;

export const singleFacetHubs = () => BLOG_HUBS.filter((h) => h.facets.length === 1);

/** Hubs relacionados: compartilham ao menos uma faceta com o hub atual. */
export const relatedHubs = (hub: BlogHub, limit = 8) =>
  BLOG_HUBS.filter(
    (h) =>
      h.slug !== hub.slug &&
      h.facets.some((f) => hub.facets.some((x) => x.key === f.key && x.value === f.value)),
  ).slice(0, limit);
