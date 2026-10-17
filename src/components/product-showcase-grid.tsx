import { Suspense, useEffect } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { getToolShowcase } from "@/lib/catalog.functions";
import { ProductCard } from "@/components/product-carousel";
import { trackSelectItem, trackViewItemList } from "@/lib/analytics";
import { showcaseToEcomItem } from "@/lib/analytics-list";

export type ShowcaseKind = "ribbon" | "labels";

export const toolShowcaseOptions = (kind: ShowcaseKind, limit = 8) =>
  queryOptions({
    queryKey: ["tool-showcase", kind, limit],
    queryFn: () => getToolShowcase({ data: { kind, limit } }),
    staleTime: 10 * 60_000,
  });

const COPY: Record<ShowcaseKind, { title: string; description: string; cta: string }> = {
  ribbon: {
    title: "Ribbons para sua impressora",
    description: "Cera, mista e resina — o 110 mm × 74 m é o mais usado nas impressoras de 4 polegadas.",
    cta: "/catalogo?cat=ribbon-cera",
  },
  labels: {
    title: "Etiquetas mais vendidas",
    description: "Rolos prontos para impressoras térmicas, nas medidas que mais saem.",
    cta: "/catalogo",
  },
};

function Grid({ kind }: { kind: ShowcaseKind }) {
  const { data } = useSuspenseQuery(toolShowcaseOptions(kind));
  const products = data.products;
  const c = COPY[kind];
  const listId = `vitrine_ferramenta_${kind}`;
  useEffect(() => {
    if (!products.length) return;
    trackViewItemList({ listId, listName: c.title, items: products.map((p, i) => showcaseToEcomItem(p, i + 1)) });
  }, [products, listId, c.title]);
  if (!products.length) return null;
  return (
    <section className="border-t hairline py-12">
      <div className="container-page">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">Vitrine</p>
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">{c.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{c.description}</p>
          </div>
          <a href={c.cta} className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.14em] text-signal hover:underline">
            Ver todos <ArrowRight className="h-3 w-3" />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p, i) => (
            <Link
              key={p.id}
              to="/produto/$slug"
              params={{ slug: p.slug }}
              className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              onClick={() => trackSelectItem({ listId, listName: c.title, item: showcaseToEcomItem(p, i + 1) })}
            >
              <ProductCard p={p} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProductShowcaseGrid({ kind }: { kind: ShowcaseKind }) {
  return (
    <Suspense fallback={null}>
      <Grid kind={kind} />
    </Suspense>
  );
}
