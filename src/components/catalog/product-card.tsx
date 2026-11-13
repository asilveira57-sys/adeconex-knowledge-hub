import { ImageOff } from "lucide-react";
import { Stars } from "@/components/reviews/star-rating";
import { ProductBadgePills } from "@/components/product-badge-pills";
import type { ShowcaseProduct } from "@/lib/catalog.functions";
import { imageSrcSet, resizedImageUrl } from "@/lib/image-url";

function money(v: number | null): string | null {
  if (v === null || v === undefined) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Grade: 2 colunas no celular, 3 no tablet, 4 no desktop (container ~1280px). */
export const PRODUCT_CARD_SIZES = "(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw";

/**
 * Card de produto usado no catálogo, nas categorias e nas vitrines.
 * `priority` = imagem acima da dobra (primeira linha): carrega sem lazy e com prioridade alta.
 */
export function ProductCard({ p, priority = false, sizes = PRODUCT_CARD_SIZES }: { p: ShowcaseProduct; priority?: boolean; sizes?: string }) {
  const price = money(p.promotional_price ?? p.price);
  const strike = p.promotional_price && p.price ? money(p.price) : null;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border hairline bg-surface-2 transition-colors hover:border-signal">
      <div className="relative aspect-square overflow-hidden bg-surface-3">
        {p.image_url ? (
          <img
            src={resizedImageUrl(p.image_url, 400) ?? p.image_url}
            srcSet={imageSrcSet(p.image_url, 640)}
            sizes={sizes}
            width={400}
            height={400}
            alt={p.image_alt ?? p.name}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            {...(priority ? { fetchPriority: "high" as const } : {})}
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
        {p.rating_count ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Stars value={p.rating_avg ?? 0} size={12} />
            <span className="tabular-nums">({p.rating_count})</span>
          </span>
        ) : null}
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
