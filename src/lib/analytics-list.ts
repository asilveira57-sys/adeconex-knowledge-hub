import type { EcomListItem } from "@/lib/analytics";
import type { ShowcaseProduct } from "@/lib/catalog.functions";

/** Converte um produto de listagem no formato de item de e-commerce. */
export function showcaseToEcomItem(
  p: ShowcaseProduct,
  index: number,
  category?: string | null,
): EcomListItem {
  return {
    item_id: p.id,
    item_name: p.name,
    item_category: category || undefined,
    price: p.promotional_price ?? p.price ?? 0,
    quantity: 1,
    index,
  };
}
