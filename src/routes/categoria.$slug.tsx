import { createFileRoute, Link, notFound, stripSearchParams } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/catalog/product-card";
import { getCategoryPageMeta, listCatalog } from "@/lib/catalog.functions";
import { displayCategoryName } from "@/lib/category-name";
import { BASE_URL, absoluteUrl, PUBLIC_PAGE_CACHE_HEADERS } from "@/lib/seo";
import { trackSelectItem, trackViewItemList } from "@/lib/analytics";
import { showcaseToEcomItem } from "@/lib/analytics-list";
import { cn } from "@/lib/utils";

/** Abaixo disso a página existe para navegação, mas não vai para o índice do Google (conteúdo fino). */
export const CATEGORY_MIN_INDEXABLE = 3;
const PAGE_SIZE = 24;

const SORTS = [
  { value: "relevance", label: "Relevância" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "newest", label: "Mais recentes" },
  { value: "name_asc", label: "Nome A–Z" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

const searchSchema = z.object({
  sort: fallback(z.enum(["relevance", "price_asc", "price_desc", "newest", "name_asc"]), "relevance").default("relevance"),
  page: fallback(z.number().int().min(1), 1).default(1),
});

const metaOptions = (slug: string) =>
  queryOptions({
    queryKey: ["public", "category-meta", slug],
    queryFn: () => getCategoryPageMeta({ data: { slug } }),
    staleTime: 5 * 60_000,
  });

const productsOptions = (slug: string, sort: Sort, page: number) =>
  queryOptions({
    queryKey: ["public", "category-products", slug, sort, page],
    queryFn: () => listCatalog({ data: { categorySlug: slug, sort, page, pageSize: PAGE_SIZE, availability: "all" } }),
    staleTime: 60_000,
  });

function categoryCopy(name: string) {
  const lower = name.toLocaleLowerCase("pt-BR");
  return `Compre ${lower} na Adeconex: medidas, materiais e quantidades para cada aplicação, com envio para todo o Brasil, nota fiscal e atendimento técnico.`;
}

/** Search sem valores padrão: URL limpa (/categoria/x?page=2), igual ao canonical. */
function cleanSearch(sort: Sort, page: number) {
  return {
    ...(sort !== "relevance" ? { sort } : {}),
    ...(page > 1 ? { page } : {}),
  } as { sort: Sort; page: number };
}

function pageHref(slug: string, page: number) {
  return page > 1 ? `/categoria/${slug}?page=${page}` : `/categoria/${slug}`;
}

export const Route = createFileRoute("/categoria/$slug")({
  headers: () => PUBLIC_PAGE_CACHE_HEADERS,
  validateSearch: zodValidator(searchSchema),
  // URL limpa: sem ?sort=relevance&page=1 (evita 307 no SSR e casa com o canonical).
  search: { middlewares: [stripSearchParams({ sort: "relevance", page: 1 })] },
  loaderDeps: ({ search }) => ({ sort: search.sort as Sort, page: search.page }),
  loader: async ({ params, context, deps }) => {
    const [meta, list] = await Promise.all([
      context.queryClient.ensureQueryData(metaOptions(params.slug)),
      context.queryClient.ensureQueryData(productsOptions(params.slug, deps.sort, deps.page)),
    ]);
    if (!meta) throw notFound();
    const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
    if (deps.page > totalPages) throw notFound();
    return { meta, total: list.total, items: list.items, totalPages };
  },
  head: ({ params, loaderData, match }) => {
    if (!loaderData) {
      return { meta: [{ title: "Categoria não encontrada — Adeconex" }, { name: "robots", content: "noindex" }] };
    }
    const { meta, total, items } = loaderData;
    const search = match.search as { sort?: string; page?: number };
    const page = search.page ?? 1;
    const name = displayCategoryName(meta.name);
    const baseTitle = meta.seo_title?.trim() || `${name} | Adeconex`;
    const title = page > 1 ? `${baseTitle} — página ${page}` : baseTitle;
    const description = meta.seo_description?.trim() || categoryCopy(name);
    const canonical = absoluteUrl(pageHref(params.slug, page));
    const indexable = total >= CATEGORY_MIN_INDEXABLE && (search.sort ?? "relevance") === "relevance";

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Catálogo", item: absoluteUrl("/catalogo") },
        { "@type": "ListItem", position: 3, name, item: absoluteUrl(`/categoria/${params.slug}`) },
      ],
    };
    const itemList = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name,
      numberOfItems: total,
      itemListElement: items.map((p, i) => ({
        "@type": "ListItem",
        position: (page - 1) * PAGE_SIZE + i + 1,
        url: absoluteUrl(`/produto/${p.slug}`),
        name: p.name,
      })),
    };

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: canonical },
        ...(items[0]?.image_url ? [{ property: "og:image", content: items[0].image_url }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        ...(indexable ? [] : [{ name: "robots", content: "noindex, follow" }]),
      ],
      links: [{ rel: "canonical", href: canonical }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(breadcrumb) },
        { type: "application/ld+json", children: JSON.stringify(itemList) },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Categoria não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">Ela pode ter sido renomeada ou removida.</p>
      <Link to="/catalogo" className="mt-6 inline-block text-sm text-signal underline underline-offset-4">
        Ver o catálogo completo
      </Link>
    </div>
  ),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const search = Route.useSearch();
  const sort = search.sort as Sort;
  const page = search.page;
  const { data: meta } = useSuspenseQuery(metaOptions(slug));
  const { data: list } = useSuspenseQuery(productsOptions(slug, sort, page));
  const navigate = Route.useNavigate();

  const name = displayCategoryName(meta?.name ?? slug);
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const offset = (page - 1) * list.pageSize;
  const listId = `categoria_${slug}`;
  const intro = meta?.description?.trim() || categoryCopy(name);

  useEffect(() => {
    if (!list.items.length) return;
    trackViewItemList({
      listId,
      listName: `Categoria · ${name}`,
      items: list.items.map((p, i) => showcaseToEcomItem(p, offset + i + 1, slug)),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, sort, page, list.items.length]);

  return (
    <div className="pb-20 pt-6">
      <div className="container-page">
        <nav aria-label="Trilha de navegação" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span aria-hidden>/</span>
          <Link to="/catalogo" className="hover:text-foreground">Catálogo</Link>
          <span aria-hidden>/</span>
          <span className="text-foreground/80">{name}</span>
        </nav>

        <header className="max-w-3xl">
          <p className="eyebrow text-muted-foreground">Categoria</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">{name}</h1>
          {page === 1 &&
            intro.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
                {para}
              </p>
            ))}
        </header>

        <div className="mb-6 mt-10 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-mono text-sm font-semibold text-foreground">{list.total}</span>{" "}
            {list.total === 1 ? "produto" : "produtos"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/catalogo"
              search={{ cat: slug } as never}
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-[0.14em] text-signal hover:underline"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden /> Mais filtros
            </Link>
            <label htmlFor="category-sort" className="sr-only">Ordenar por</label>
            <select
              id="category-sort"
              value={sort}
              onChange={(e) => navigate({ search: cleanSearch(e.target.value as Sort, 1) })}
              className="h-10 rounded-md border border-foreground/20 bg-surface-2 px-3 text-sm font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {list.items.length === 0 ? (
          <div className="rounded-lg border hairline bg-surface-2 p-10 text-center text-sm text-muted-foreground">
            Nenhum produto disponível nesta categoria no momento.{" "}
            <Link to="/catalogo" className="text-signal underline underline-offset-4">Ver o catálogo completo</Link>.
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {list.items.map((p, i) => (
              <li key={p.id}>
                <Link
                  to="/produto/$slug"
                  params={{ slug: p.slug }}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  aria-label={p.name}
                  onClick={() =>
                    trackSelectItem({
                      listId,
                      listName: `Categoria · ${name}`,
                      item: showcaseToEcomItem(p, offset + i + 1, slug),
                    })
                  }
                >
                  <ProductCard p={p} priority={i < 4} />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <nav aria-label="Paginação" className="mt-10 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">Página {page} de {totalPages}</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <PageLink slug={slug} sort={sort} page={page - 1} disabled={page <= 1} label="Anterior">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </PageLink>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <PageLink key={n} slug={slug} sort={sort} page={n} current={n === page} label={`Página ${n}`}>
                  {n}
                </PageLink>
              ))}
              <PageLink slug={slug} sort={sort} page={page + 1} disabled={page >= totalPages} label="Próxima">
                Próxima <ChevronRight className="h-4 w-4" />
              </PageLink>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}

/** Paginação com <a href> reais: o Google segue os links e indexa as páginas seguintes. */
function PageLink({
  slug,
  sort,
  page,
  disabled,
  current,
  label,
  children,
}: {
  slug: string;
  sort: Sort;
  page: number;
  disabled?: boolean;
  current?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const cls = cn(
    "inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-md border hairline px-3 text-sm transition-colors",
    current ? "border-signal bg-signal/10 font-semibold text-signal" : "hover:border-signal",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) {
    return (
      <span className={cls} aria-disabled="true">
        {children}
      </span>
    );
  }
  return (
    <Link
      to="/categoria/$slug"
      params={{ slug }}
      search={cleanSearch(sort, page)}
      className={cls}
      aria-label={label}
      aria-current={current ? "page" : undefined}
      resetScroll
    >
      {children}
    </Link>
  );
}
