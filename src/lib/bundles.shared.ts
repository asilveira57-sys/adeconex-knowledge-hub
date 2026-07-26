/**
 * "Compre Junto" — tipos compartilhados e algoritmo puro de aplicação de
 * desconto sobre o carrinho. Sem I/O, seguro para bundle client/server.
 */

export type BundleDiscountType =
  | "percent"
  | "fixed"
  | "fixed_price"
  | "complement_percent"
  | "complement_fixed";

export type BundleVariantScope = "any" | "specific" | "any_kit";

export type BundleOfferItem = {
  id: string;
  offer_id: string;
  product_id: string;
  variant_id: string | null;
  variant_scope: BundleVariantScope;
  quantity: number;
  is_anchor: boolean;
  is_complement_target: boolean;
  sort_order: number;
  // Snapshot para exibição (opcional)
  product_name?: string;
  product_slug?: string;
  variant_label?: string | null;
  unit_price?: number | null;
  image_url?: string | null;
};

export type BundleOffer = {
  id: string;
  product_id: string;
  name: string;
  discount_type: BundleDiscountType;
  discount_value: number;
  allow_stack_with_coupon: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  sort_order: number;
  items: BundleOfferItem[];
};

export type BundleCartLine = {
  item_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  unit_price: number;
  is_kit_variant?: boolean;
};

export type BundleApplication = {
  offer_id: string;
  name: string;
  applications: number;
  normal_price_per_bundle: number;
  discount_per_bundle: number;
  total_discount: number;
  affected_item_ids: string[];
};

function itemMatchesLine(oi: BundleOfferItem, line: BundleCartLine): boolean {
  if (oi.product_id !== line.product_id) return false;
  switch (oi.variant_scope) {
    case "specific":
      return oi.variant_id != null && line.variant_id === oi.variant_id;
    case "any_kit":
      return !!line.is_kit_variant;
    case "any":
    default:
      return true;
  }
}

export function computeBundleApplications(
  lines: BundleCartLine[],
  offers: BundleOffer[],
): BundleApplication[] {
  // Pool consumível de cada linha; ofertas competindo pelos mesmos itens
  // são aplicadas em ordem de "sort_order" e o excedente fica sem desconto.
  const remaining = new Map<string, number>();
  for (const l of lines) remaining.set(l.item_id, l.quantity);

  const sorted = [...offers].sort((a, b) => a.sort_order - b.sort_order);
  const out: BundleApplication[] = [];

  for (const offer of sorted) {
    if (!offer.is_active) continue;
    if (offer.items.length === 0) continue;

    // Para cada item obrigatório: linhas candidatas
    const matches = offer.items.map((oi) => {
      const matched = lines.filter((l) => itemMatchesLine(oi, l));
      const available = matched.reduce((s, l) => s + (remaining.get(l.item_id) ?? 0), 0);
      const maxConjuntos = oi.quantity > 0 ? Math.floor(available / oi.quantity) : 0;
      const priceRef = matched.find((l) => (l.unit_price ?? 0) > 0)?.unit_price ?? 0;
      return { oi, matched, maxConjuntos, priceRef };
    });

    if (matches.some((m) => m.matched.length === 0)) continue;
    const N = Math.min(...matches.map((m) => m.maxConjuntos));
    if (N <= 0) continue;

    // Consome do pool
    const affected = new Set<string>();
    for (const m of matches) {
      let needed = N * m.oi.quantity;
      for (const l of m.matched) {
        if (needed <= 0) break;
        const cur = remaining.get(l.item_id) ?? 0;
        const take = Math.min(cur, needed);
        if (take > 0) {
          remaining.set(l.item_id, cur - take);
          affected.add(l.item_id);
          needed -= take;
        }
      }
    }

    // Preço normal por conjunto = soma(unit_price * quantidade) por item
    const normal_price_per_bundle = matches.reduce(
      (s, m) => s + m.priceRef * m.oi.quantity,
      0,
    );
    const normal_complement_only = matches
      .filter((m) => m.oi.is_complement_target)
      .reduce((s, m) => s + m.priceRef * m.oi.quantity, 0);

    let discount_per_bundle = 0;
    switch (offer.discount_type) {
      case "percent":
        discount_per_bundle = (normal_price_per_bundle * offer.discount_value) / 100;
        break;
      case "fixed":
        discount_per_bundle = Math.min(offer.discount_value, normal_price_per_bundle);
        break;
      case "fixed_price":
        discount_per_bundle = Math.max(0, normal_price_per_bundle - offer.discount_value);
        break;
      case "complement_percent":
        discount_per_bundle = (normal_complement_only * offer.discount_value) / 100;
        break;
      case "complement_fixed":
        discount_per_bundle = Math.min(offer.discount_value, normal_complement_only);
        break;
    }
    discount_per_bundle = Math.max(0, Number(discount_per_bundle.toFixed(2)));
    const total_discount = Number((discount_per_bundle * N).toFixed(2));
    if (total_discount <= 0) continue;

    out.push({
      offer_id: offer.id,
      name: offer.name,
      applications: N,
      normal_price_per_bundle: Number(normal_price_per_bundle.toFixed(2)),
      discount_per_bundle,
      total_discount,
      affected_item_ids: Array.from(affected),
    });
  }

  return out;
}

export function money(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
