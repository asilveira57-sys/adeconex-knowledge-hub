import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Suspense, useEffect } from "react";
import { trackViewItemList, trackSelectItem, trackViewSearchResults } from "@/lib/analytics";
import { showcaseToEcomItem } from "@/lib/analytics-list";

import { ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductBadgePills } from "@/components/product-badge-pills";
import {
  getCatalogBadges,
  getCatalogCategories,
  listCatalog,
  type ShowcaseProduct,
} from "@/lib/catalog.functions";

const searchSchema = z.object({
  cat: fallback(z.string().optional(), undefined).default(undefined as unknown as string),
  badge: fallback(z.string().optional(), undefined).default(undefined as unknown as string),
  frete: fallback(z.boolean(), false).default(false),
  promo: fallback(z.boolean(), false).default(false),
  disp: fallback(z.string(), "all").default("all"),
  sort: fallback(z.string(), "relevance").default("relevance"),
  page: fallback(z.number().int().min(1), 1).default(1),
});

type CatalogSearch = {
  cat?: string;
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

const badgesOptions = queryOptions({
  queryKey: ["catalog", "badges"],
  queryFn: () => getCatalogBadges(),
  staleTime: 5 * 60_000,
});

type ListFilters = {
  cat?: string;
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
          badge: f.badge,
          freeShipping: f.frete || undefined,
          onSale: f.promo || undefined,
          availability: f.disp === "in_stock" ? "in_stock" : "all",
          sort: (["relevance", "newest", "price_asc", "price_desc", "name_asc"].includes(f.sort)
            ? f.sort
            : "relevance") as "relevance",
          page: f.page,
          pageSize: 12,
        },
      }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/catalogo")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({
    cat: search.cat,
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
      context.queryClient.ensureQueryData(listOptions(deps)),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Catálogo técnico — Adeconex" },
      {
        name: "description",
        content:
          "Etiquetas couchê, BOPP, ribbons e mais. Filtre por tipo de produto e navegue por páginas.",
      },
      { property: "og:title", content: "Catálogo técnico — Adeconex" },
      { property: "og:description", content: "Filtre por família e encontre etiquetas, ribbons e insumos." },
      { property: "og:url", content: "/catalogo" },
    ],
    links: [{ rel: "canonical", href: "/catalogo" }],
  }),
  component: CatalogPage,
});

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

function CategoryFilter({ active }: { active: string | undefined }) {
  const { data } = useSuspenseQuery(categoriesOptions);
  const navigate = useNavigate({ from: "/catalogo" });
  const setCat = (slug: string | undefined) =>
    navigate({ search: (prev: CatalogSearch) => ({ ...prev, cat: slug, page: 1 }) });

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setCat(undefined)} className={pillClass(!active)}>
        Todos
      </button>
      {data.categories.map((c) => (
        <button key={c.slug} type="button" onClick={() => setCat(c.slug)} className={pillClass(c.slug === active)}>
          {c.name} <span className="ml-1 opacity-60">{c.count}</span>
        </button>
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
    !!search.cat || !!search.badge || search.frete || search.promo || search.disp !== "all" || search.sort !== "relevance";

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t hairline pt-4">
      <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Selo</span>
      <button type="button" onClick={() => patch({ badge: undefined })} className={pillClass(!search.badge)}>
        Qualquer
      </button>
      {data.badges.map((b) => (
        <button
          key={b.key}
          type="button"
          onClick={() => patch({ badge: search.badge === b.key ? undefined : b.key })}
          className={pillClass(search.badge === b.key)}
        >
          {b.label}
        </button>
      ))}

      <span className="ml-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">Filtros</span>
      <button type="button" onClick={() => patch({ frete: !search.frete })} className={pillClass(search.frete)}>
        Frete grátis
      </button>
      <button type="button" onClick={() => patch({ promo: !search.promo })} className={pillClass(search.promo)}>
        Preço promocional
      </button>
      <button
        type="button"
        onClick={() => patch({ disp: search.disp === "in_stock" ? "all" : "in_stock" })}
        className={pillClass(search.disp === "in_stock")}
      >
        Em estoque
      </button>

      <div className="ml-auto flex items-center gap-2">
        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              navigate({
                search: () => ({ cat: undefined, badge: undefined, frete: false, promo: false, disp: "all", sort: "relevance", page: 1 }),
              })
            }
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Limpar filtros
          </button>
        )}
        <label htmlFor="catalog-sort" className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          Ordenar
        </label>
        <select
          id="catalog-sort"
          value={search.sort}
          onChange={(e) => patch({ sort: e.target.value })}
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
  if (s.badge) f.badge = s.badge;
  if (s.frete) f.free_shipping = true;
  if (s.promo) f.on_sale = true;
  if (s.disp === "in_stock") f.in_stock = true;
  if (s.sort && s.sort !== "relevance") f.sort = s.sort;
  return f;
}

function CatalogGrid() {

  const search = Route.useSearch();
  const { page } = search;
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
  const filtersKey = JSON.stringify([search.cat, search.badge, search.frete, search.promo, search.disp, search.sort, page]);
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
            onClick={() =>
              navigate({ search: (prev: CatalogSearch) => ({ ...prev, page: Math.max(1, page - 1) }) })
            }
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              navigate({ search: (prev: CatalogSearch) => ({ ...prev, page: Math.min(totalPages, page + 1) }) })
            }
          >
            Próxima <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}


function CatalogPage() {
  const { cat } = Route.useSearch();
  return (
    <>
      <Section>
        <SectionHeader
          eyebrow="Catálogo"
          title="Encontre a etiqueta certa"
          description="Filtre por família de produto e navegue por páginas. Cada item traz ficha técnica, compatibilidade e canais de compra."
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
              <CategoryFilter active={cat} />
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
