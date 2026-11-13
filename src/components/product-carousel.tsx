import { useEffect } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { trackViewItemList, trackSelectItem } from "@/lib/analytics";
import { showcaseToEcomItem } from "@/lib/analytics-list";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { type ShowcaseProduct } from "@/lib/catalog.functions";
import { showcaseOptions } from "@/lib/showcase.queries";
import { ProductCard } from "@/components/catalog/product-card";

export { ProductCard };

export { showcaseOptions };




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

  const listId = `vitrine_${categorySlug}`;
  useEffect(() => {
    if (products.length === 0) return;
    trackViewItemList({
      listId,
      listName: title,
      items: products.map((p, i) => showcaseToEcomItem(p, i + 1, categorySlug)),
    });
  }, [products, listId, title, categorySlug]);

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
            {products.map((p, i) => (
              <CarouselItem
                key={p.id}
                className="basis-[75%] pl-3 sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
              >
                <Link
                  to="/produto/$slug"
                  params={{ slug: p.slug }}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                  aria-label={p.name}
                  onClick={() =>
                    trackSelectItem({
                      listId,
                      listName: title,
                      item: showcaseToEcomItem(p, i + 1, categorySlug),
                    })
                  }
                >

                  <ProductCard
                    p={p}
                    sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 75vw"
                  />
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
