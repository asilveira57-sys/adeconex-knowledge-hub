import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Suspense } from "react";
import { ImageOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProductBadgePills } from "@/components/product-badge-pills";
import {
  getCatalogCategories,
  listCatalog,
  type ShowcaseProduct,
} from "@/lib/catalog.functions";

const searchSchema = z.object({
  cat: fallback(z.string().optional(), undefined).default(undefined as unknown as string),
  page: fallback(z.number().int().min(1), 1).default(1),
});

const categoriesOptions = queryOptions({
  queryKey: ["catalog", "categories"],
  queryFn: () => getCatalogCategories(),
  staleTime: 5 * 60_000,
});

const listOptions = (cat: string | undefined, page: number) =>
  queryOptions({
    queryKey: ["catalog", "list", cat ?? "all", page],
    queryFn: () => listCatalog({ data: { categorySlug: cat, page, pageSize: 12 } }),
    staleTime: 60_000,
  });

export const Route = createFileRoute("/catalogo")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => ({ cat: search.cat, page: search.page }),
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(categoriesOptions),
      context.queryClient.ensureQueryData(listOptions(deps.cat, deps.page)),
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

function CategoryFilter({ active }: { active: string | undefined }) {
  const { data } = useSuspenseQuery(categoriesOptions);
  return (
    <div className="mb-8 flex flex-wrap gap-2">
      <Link
        to="/catalogo"
        search={{ page: 1 }}
        className={cn(
          "rounded-full border hairline px-3 py-1.5 text-xs font-mono uppercase tracking-[0.14em] transition-colors",
          !active
            ? "border-signal bg-signal/10 text-signal"
            : "text-muted-foreground hover:border-signal hover:text-foreground",
        )}
      >
        Todos
      </Link>
      {data.categories.map((c) => {
        const isActive = c.slug === active;
        return (
          <Link
            key={c.slug}
            to="/catalogo"
            search={{ cat: c.slug, page: 1 }}
            className={cn(
              "rounded-full border hairline px-3 py-1.5 text-xs font-mono uppercase tracking-[0.14em] transition-colors",
              isActive
                ? "border-signal bg-signal/10 text-signal"
                : "text-muted-foreground hover:border-signal hover:text-foreground",
            )}
          >
            {c.name} <span className="ml-1 opacity-60">{c.count}</span>
          </Link>
        );
      })}
    </div>
  );
}

function CatalogGrid() {
  const { cat, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/catalogo" });
  const { data } = useSuspenseQuery(listOptions(cat, page));
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  if (data.items.length === 0) {
    return (
      <div className="rounded-lg border hairline bg-surface-2 p-10 text-center text-sm text-muted-foreground">
        Nenhum produto encontrado nesta categoria.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {data.items.map((p) => (
          <Link
            key={p.id}
            to="/produto/$slug"
            params={{ slug: p.slug }}
            className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            aria-label={p.name}
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
              navigate({ search: (prev: { cat?: string; page: number }) => ({ ...prev, page: Math.max(1, page - 1) }) })
            }
          >
            <ChevronLeft className="h-4 w-4" /> Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() =>
              navigate({ search: (prev: { cat?: string; page: number }) => ({ ...prev, page: Math.min(totalPages, page + 1) }) })
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
            <CategoryFilter active={cat} />
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
