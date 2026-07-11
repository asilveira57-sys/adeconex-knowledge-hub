import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ImageOff, ArrowRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getShowcase, type ShowcaseProduct } from "@/lib/catalog.functions";

export const showcaseOptions = (categorySlug: string, limit = 9) =>
  queryOptions({
    queryKey: ["showcase", categorySlug, limit],
    queryFn: () => getShowcase({ data: { categorySlug, limit } }),
    staleTime: 5 * 60_000,
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

export function ProductCarousel({
  categorySlug,
  title,
  eyebrow,
  description,
  ctaHref,
}: {
  categorySlug: string;
  title: string;
  eyebrow?: string;
  description?: string;
  ctaHref?: string;
}) {
  const { data } = useSuspenseQuery(showcaseOptions(categorySlug, 9));
  const products = data.products;
  if (products.length === 0) return null;

  return (
    <section className="py-12">
      <div className="container-page">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            {eyebrow && (
              <p className="eyebrow text-muted-foreground">{eyebrow}</p>
            )}
            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {title}
            </h2>
            {description && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {ctaHref && (
            <a
              href={ctaHref}
              className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.14em] text-signal hover:underline"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </a>
          )}
        </div>

        <Carousel opts={{ align: "start", dragFree: true }} className="w-full">
          <CarouselContent className="-ml-3">
            {products.map((p) => (
              <CarouselItem
                key={p.id}
                className="basis-[75%] pl-3 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <Link
                  to="/produto/$slug"
                  params={{ slug: p.slug }}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  aria-label={p.name}
                >
                  <ProductCard p={p} />
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </section>
  );
}
