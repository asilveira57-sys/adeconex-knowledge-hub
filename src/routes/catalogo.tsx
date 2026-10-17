import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Suspense, useEffect } from "react";
import {
  trackViewItemList,
  trackSelectItem,
  trackViewSearchResults,
  trackSearchPageChange,
  trackSearchSortChange,
} from "@/lib/analytics";
import { showcaseToEcomItem } from "@/lib/analytics-list";

import { ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ProductBadgePills } from "@/components/product-badge-pills";
import {
  getCatalogBadges,
  getCatalogCategories,
  getCatalogFacets,
  listCatalog,
  type ShowcaseProduct,
} from "@/lib/catalog.functions";

const searchSchema = z.object({
  cat: z.string().optional(),
  marca: z.string().optional(),
  aplicacao: z.string().optional(),
  badge: fallback(z.string().optional(), undefined).default(undefined as unknown as string),
  frete: fallback(z.boolean(), false).default(false),
  promo: fallback(z.boolean(), false).default(false),
  disp: fallback(z.string(), "all").default("all"),
  sort: fallback(z.string(), "relevance").default("relevance"),
  page: fallback(z.number().int(), 1).default(1),
});

type CatalogSearch = {
  cat?: string;
  marca?: string;
  aplicacao?: string;
  badge?: string;
  frete: boolean;
  promo: boolean;
  disp: string;
  sort: string;
  page: number;
};

const SORTS = [
  { value: "relevance", label: "Relevância" },
  { value: "newest", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "name_asc", label: "A–Z" },
] as const;

const categoriesOptions = queryOptions({
  queryKey: ["catalog", "categories"],
  queryFn: () => getCatalogCategories(),
  staleTime: 5 * 60_000,
});

const facetsOptions = queryOptions({
  queryKey: ["catalog", "facets"],
  queryFn: () => getCatalogFacets(),
  staleTime: 5 * 60_000,
});

const badgesOptions = queryOptions({
  queryKey: ["catalog", "badges"],
  queryFn: () => getCatalogBadges(),
  staleTime: 5 * 60_000,
});

type ListFilters = {
  cat?: string;
  marca?: string;
  aplicacao?: string;
  badge?: string;
  frete: boolean;
  promo: boolean;
  disp: string;
  sort: string;
  page: number;
};

const listOptions = (f: ListFilters) =>
  queryOptions({
    queryKey: ["catalog", "list", f],
    queryFn: () =>
      listCatalog({
        data: {
          categorySlug: f.cat,
          brandSlug: f.marca,
          applicationSlug: f.aplicacao,
          badge: f.badge,
          freeShipping: f.frete || undefined,
          onSale: f.promo || undefined,
          availability: f.disp === "in_stock" ? "in_stock" : "all",
          sort: (["relevance", "newest", "price_asc", "price_desc", "name_asc"].includes(f.sort)
            ? f.sort
            : "relevance") as "relevance",
          page: Math.max(1, f.page),
          pageSize: 12,
        },
      }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/catalogo")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    cat: search.cat,
    marca: search.marca,
    aplicacao: search.aplicacao,
    badge: search.badge,
    frete: search.frete,
    promo: search.promo,
    disp: search.disp,
    sort: search.sort,
    page: search.page,
  }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesOptions),
      context.queryClient.ensureQueryData(badgesOptions),
      context.queryClient.ensureQueryData(facetsOptions),
      context.queryClient.ensureQueryData(listOptions(deps)),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Catálogo técnico — Adeconex" },
      {
        name: "description",
        content:
          "Etiquetas couchê, BOPP, ribbons e mais. Encontre produtos por categoria, marca e aplicação.",
      },
      { property: "og:title", content: "Catálogo técnico — Adeconex" },
      { property: "og:description", content: "Encontre etiquetas, ribbons e insumos por categoria, marca e aplicação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "/catalogo" },
    ],
    links: [{ rel: "canonical", href: "/catalogo" }],
  }),
  errorComponent: CatalogError,
  notFoundComponent: () => <div className="container-page py-16">Catálogo não encontrado.</div>,
  component: CatalogPage,
});

function CatalogError() {
  const router = useRouter();
  return (
    <section className="container-page py-16" role="alert">
      <h1 className="text-2xl font-semibold">Não foi possível carregar o catálogo</h1>
      <p className="mt-3 text-muted-foreground">Tente novamente para consultar os produtos.</p>
      <Button className="mt-6" onClick={() => router.invalidate()}>Tentar novamente</Button>
    </section>
  );
}

function money(v: number | null): string | null {
  if (v === null || v === undefined) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProductCard({ p }: { p: ShowcaseProduct }) {
  const price = money(p.promotional_price ?? p.price);
  const strike = p.promotional_price && p.price ? money(p.price) : null;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border hairline bg-surface-2 transition-colors hover:border-signal">
      <div className="relative aspect-square overflow-hidden bg-surface-3">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.image_alt ?? p.name}
            loading="lazy"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <ProductBadgePills badges={p.badges} className="absolute left-2 top-2" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug">{p.name}</h3>
        {p.short_description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{p.short_description}</p>
        )}
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-2">
          {price ? (
            <div className="flex flex-col leading-tight">
              <span className="text-base font-semibold">{price}</span>
              {strike && <span className="text-[10px] text-muted-foreground line-through">{strike}</span>}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Sob consulta</span>
          )}
          <span className="text-xs font-mono uppercase tracking-[0.14em] text-signal">Detalhes</span>
        </div>
      </div>
    </article>
  );
}

const pillClass = (active: boolean) =>
  cn(
    "rounded-full border hairline px-3 py-1.5 text-xs font-mono uppercase tracking-[0.14em] transition-colors",
    active
      ? "border-signal bg-signal/10 text-signal"
      : "text-muted-foreground hover:border-signal hover:text-foreground",
  );

function CatalogTaxonomyFilters() {
  const search = Route.useSearch();
  const { data: categoryData } = useSuspenseQuery(categoriesOptions);
  const { data: facets } = useSuspenseQuery(facetsOptions);
  const navigate = useNavigate({ from: "/catalogo" });
  const filters = [
    { key: "cat" as const, label: "Categoria", all: "Todas as categorias", options: categoryData.categories },
    { key: "marca" as const, label: "Marca", all: "Todas as marcas", options: facets.brands },
    { key: "aplicacao" as const, label: "Aplicação", all: "Todas as aplicações", options: facets.applications },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {filters.map((filter) => (
        <div key={filter.key} className="min-w-0 space-y-2">
          <label htmlFor={`catalog-${filter.key}`} className="text-sm font-medium">{filter.label}</label>
          <Select
            value={search[filter.key] || "__all"}
            onValueChange={(value) => navigate({ search: (prev) => ({ ...prev, [filter.key]: value === "__all" ? undefined : value, page: 1 }) })}
          >
            <SelectTrigger id={`catalog-${filter.key}`} className="h-11 bg-surface-2" aria-label={filter.label}>
              <SelectValue placeholder={filter.all} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">{filter.all}</SelectItem>
              {search[filter.key] && !filter.options.some((option) => option.slug === search[filter.key]) && (
                <SelectItem value={search[filter.key] ?? "__unknown"}>Opção indisponível</SelectItem>
              )}
              {filter.options.map((option) => (
                <SelectItem key={option.slug} value={option.slug}>{option.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

function AdvancedFilters() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });
  const { data } = useSuspenseQuery(badgesOptions);

  const patch = (next: Partial<CatalogSearch>) =>
    navigate({ search: (prev: CatalogSearch) => ({ ...prev, ...next, page: 1 }) });

  const hasFilters =
    !!search.cat || !!search.marca || !!search.aplicacao || !!search.badge || search.frete || search.promo || search.disp !== "all" || search.sort !== "relevance";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t hairline pt-4">
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Selo</span>
      <Button variant="ghost" size="sm" type="button" onClick={() => patch({ badge: undefined })} className={pillClass(!search.badge)}>
        Qualquer
      </Button>
      {data.badges.map((b) => (
        <Button variant="ghost" size="sm"
          key={b.key}
          type="button"
          onClick={() => patch({ badge: search.badge === b.key ? undefined : b.key })}
          className={pillClass(search.badge === b.key)}
        >
          {b.label}
        </Button>
      ))}

      <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Filtros</span>
      <Button variant="ghost" size="sm" type="button" onClick={() => patch({ frete: !search.frete })} className={pillClass(search.frete)}>
        Frete grátis
      </Button>
      <Button variant="ghost" size="sm" type="button" onClick={() => patch({ promo: !search.promo })} className={pillClass(search.promo)}>
        Preço promocional
      </Button>
      <Button variant="ghost" size="sm"
        type="button"
        onClick={() => patch({ disp: search.disp === "in_stock" ? "all" : "in_stock" })}
        className={pillClass(search.disp === "in_stock")}
      >
        Em estoque
      </Button>

      <div className="ml-auto flex items-center gap-2">
        {hasFilters && (
          <Button variant="ghost" size="sm"
            type="button"
            onClick={() =>
              navigate({
                search: () => ({ cat: undefined, marca: undefined, aplicacao: undefined, badge: undefined, frete: false, promo: false, disp: "all", sort: "relevance", page: 1 }),
              })
            }
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Limpar filtros
          </Button>
        )}
        <label htmlFor="catalog-sort" className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Ordenar
        </label>
        <select
          id="catalog-sort"
          value={search.sort}
          onChange={(e) => {
            const nextSort = e.target.value;
            if (nextSort === search.sort) return;
            trackSearchSortChange({
              searchTerm: buildSearchTerm(search),
              filters: buildActiveFilters(search),
              sort: nextSort,
              previousSort: search.sort,
              pageNumber: search.page,
            });
            patch({ sort: nextSort });
          }}
          className="rounded-md border hairline bg-surface-2 px-3 py-1.5 text-xs"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

/** Resumo dos filtros ativos, usado como termo de busca nos eventos. */
function buildSearchTerm(s: CatalogSearch): string | null {
  const parts: string[] = [];
  if (s.cat) parts.push(`cat:${s.cat}`);
  if (s.marca) parts.push(`marca:${s.marca}`);
  if (s.aplicacao) parts.push(`aplicacao:${s.aplicacao}`);
  if (s.badge) parts.push(`selo:${s.badge}`);
  if (s.frete) parts.push("frete_gratis");
  if (s.promo) parts.push("promocao");
  if (s.disp === "in_stock") parts.push("em_estoque");
  if (s.sort && s.sort !== "relevance") parts.push(`ordem:${s.sort}`);
  return parts.length > 0 ? parts.join(" ") : null;
}

/** Filtros ativos estruturados para o evento view_search_results. */
function buildActiveFilters(s: CatalogSearch): Record<string, string | number | boolean> {
  const f: Record<string, string | number | boolean> = {};
  if (s.cat) f.category = s.cat;
  if (s.marca) f.brand = s.marca;
  if (s.aplicacao) f.application = s.aplicacao;
  if (s.badge) f.badge = s.badge;
  if (s.frete) f.free_shipping = true;
  if (s.promo) f.on_sale = true;
  if (s.disp === "in_stock") f.in_stock = true;
  if (s.sort && s.sort !== "relevance") f.sort = s.sort;
  return f;
}

function CatalogGrid() {

  const search = Route.useSearch();
  const page = Math.max(1, search.page);
  const navigate = useNavigate({ from: "/catalogo" });
  const { data } = useSuspenseQuery(listOptions(search));
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const listId = "catalogo";
  const listName = search.cat ? `Catálogo · ${search.cat}` : "Catálogo";
  const searchTerm = buildSearchTerm(search);
  const offset = (page - 1) * data.pageSize;

  const items = data.items;

  // view_search_results: termo, filtros aplicados e quantidade exibida — dispara
  // uma vez por combinação de filtros/página, mesmo quando não há resultados.
  const filtersKey = JSON.stringify([search.cat, search.marca, search.aplicacao, search.badge, search.frete, search.promo, search.disp, search.sort, page]);
  useEffect(() => {
    trackViewSearchResults({
      searchTerm,
      filters: buildActiveFilters(search),
      resultsTotal: data.total,
      itemsShown: items.length,
      page,
      items: items.map((p, i) => showcaseToEcomItem(p, offset + i + 1, search.cat)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey, data.total, items.length]);

  useEffect(() => {
    if (items.length === 0) return;
    trackViewItemList({
      listId,
      listName,
      searchTerm,
      items: items.map((p, i) => showcaseToEcomItem(p, offset + i + 1, search.cat)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, listId, listName, searchTerm, offset]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border hairline bg-surface-2 p-10 text-center text-sm text-muted-foreground">
        Nenhum produto encontrado com os filtros atuais.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {items.map((p, i) => (
          <Link
            key={p.id}
            to="/produto/$slug"
            params={{ slug: p.slug }}
            className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            aria-label={p.name}
            onClick={() =>
              trackSelectItem({
                listId,
                listName,
                item: showcaseToEcomItem(p, offset + i + 1, search.cat),
              })
            }
          >
            <ProductCard p={p} />
          </Link>
        ))}
      </div>


      <div className="mt-10 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          Página {page} de {totalPages} · {data.total} produtos
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const nextPage = Math.max(1, page - 1);
              trackSearchPageChange({
                searchTerm,
                filters: buildActiveFilters(search),
                sort: search.sort,
                pageNumber: nextPage,
                previousPage: page,
              });
              navigate({ search: (prev: CatalogSearch) => ({ ...prev, page: nextPage }) });
            }}
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              const nextPage = Math.min(totalPages, page + 1);
              trackSearchPageChange({
                searchTerm,
                filters: buildActiveFilters(search),
                sort: search.sort,
                pageNumber: nextPage,
                previousPage: page,
              });
              navigate({ search: (prev: CatalogSearch) => ({ ...prev, page: nextPage }) });
            }}
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}


function CatalogPage() {
  return (
    <>
      <Section>
        <SectionHeader
          eyebrow="Catálogo"
          title="Encontre a etiqueta certa"
          
        />
      </Section>
      <section className="pb-20">
        <div className="container-page">
          <Suspense
            fallback={
              <div className="py-6 text-sm text-muted-foreground">Carregando filtros…</div>
            }
          >
            <div className="mb-8">
              <CatalogTaxonomyFilters />
              <AdvancedFilters />
            </div>
          </Suspense>
          <Suspense
            fallback={
              <div className="py-12 text-sm text-muted-foreground">Carregando produtos…</div>
            }
          >
            <CatalogGrid />
          </Suspense>
        </div>
      </section>
    </>
  );
}
