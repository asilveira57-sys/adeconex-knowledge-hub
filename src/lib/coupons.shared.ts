/**
 * Cálculo puro de cupons — sem I/O. Recebe cupom hidratado + linhas
 * do carrinho já anotadas com product_id e category_ids, e devolve
 * o desconto elegível segundo a ordem de precedência:
 *
 *   produto excluído  -> nunca
 *   produto incluído  -> sempre (se lista existir)
 *   categoria excluída-> nunca
 *   categoria incluída-> sempre (se lista existir)
 *   sem vínculos      -> carrinho inteiro
 */

export type CouponRules = {
  id: string;
  code: string;
  name: string | null;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  min_order_amount: number;
  max_discount_per_order: number | null;
  max_total_discount: number | null;
  total_discount_used: number;
  applies_to_all_customers: boolean;
  applies_to_all_categories: boolean;
  applies_to_all_products: boolean;
  stack_with_promotions: boolean;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  max_uses_per_user: number | null;

  allowed_customers: Set<string>;          // vazia => sem restrição por cliente
  included_products: Set<string>;
  excluded_products: Set<string>;
  included_categories: Set<string>;
  excluded_categories: Set<string>;
};

export type CouponLine = {
  item_id: string;
  product_id: string;
  category_ids: string[];
  quantity: number;
  unit_price: number;
  line_total: number;
  /** Marca se a linha já recebeu desconto de bundle. */
  bundle_applied?: boolean;
};

export type CouponEvaluation = {
  ok: boolean;
  reason?: string;
  eligible_total: number;
  discount: number;
  affected_item_ids: string[];
};

export function evaluateCoupon(params: {
  coupon: CouponRules;
  lines: CouponLine[];
  user_id: string | null;
  now?: Date;
  uses_total?: number;
  uses_user?: number;
}): CouponEvaluation {
  const empty: CouponEvaluation = { ok: false, eligible_total: 0, discount: 0, affected_item_ids: [] };
  const c = params.coupon;
  const now = params.now ?? new Date();

  if (!c.is_active) return { ...empty, reason: "Cupom inativo" };
  if (c.starts_at && new Date(c.starts_at) > now) return { ...empty, reason: "Cupom ainda não disponível" };
  if (c.expires_at && new Date(c.expires_at) < now) return { ...empty, reason: "Cupom expirado" };
  if (c.max_uses != null && (params.uses_total ?? 0) >= c.max_uses) {
    return { ...empty, reason: "Cupom esgotado" };
  }
  if (c.max_uses_per_user != null && (params.uses_user ?? 0) >= c.max_uses_per_user) {
    return { ...empty, reason: "Você já utilizou este cupom o número máximo de vezes" };
  }
  if (!c.applies_to_all_customers) {
    if (!params.user_id || !c.allowed_customers.has(params.user_id)) {
      return { ...empty, reason: "Cupom não disponível para este cliente" };
    }
  }

  // Linhas elegíveis pela ordem de precedência
  const eligibleLines = params.lines.filter((l) => {
    if (c.excluded_products.has(l.product_id)) return false;
    if (!c.applies_to_all_products && c.included_products.size > 0) {
      if (c.included_products.has(l.product_id)) return true;
      // se lista de produtos existir e produto não está incluído, testa categorias
    } else if (!c.applies_to_all_products) {
      return false; // marcou "apenas produtos vinculados" mas lista vazia
    }
    if (l.category_ids.some((id) => c.excluded_categories.has(id))) return false;
    if (!c.applies_to_all_categories && c.included_categories.size > 0) {
      return l.category_ids.some((id) => c.included_categories.has(id));
    } else if (!c.applies_to_all_categories) {
      return false;
    }
    if (!c.stack_with_promotions && l.bundle_applied) return false;
    return true;
  });

  const eligible_total = round2(eligibleLines.reduce((s, l) => s + l.line_total, 0));
  const cart_total = round2(params.lines.reduce((s, l) => s + l.line_total, 0));

  if (cart_total < c.min_order_amount) {
    return {
      ...empty,
      eligible_total,
      reason: `Pedido mínimo de R$ ${c.min_order_amount.toFixed(2)} não atingido`,
    };
  }
  if (eligible_total <= 0) {
    return { ...empty, eligible_total, reason: "Nenhum item elegível para este cupom" };
  }

  let discount = c.type === "percent"
    ? round2((eligible_total * c.value) / 100)
    : c.type === "fixed"
    ? round2(Math.min(c.value, eligible_total))
    : 0; // free_shipping tratado fora

  if (c.max_discount_per_order != null) {
    discount = round2(Math.min(discount, c.max_discount_per_order));
  }
  if (c.max_total_discount != null) {
    const remaining = Math.max(0, c.max_total_discount - c.total_discount_used);
    discount = round2(Math.min(discount, remaining));
    if (discount <= 0) {
      return { ...empty, eligible_total, reason: "Cupom esgotou o limite acumulado de desconto" };
    }
  }
  if (discount <= 0) return { ...empty, eligible_total, reason: "Desconto insuficiente" };

  return {
    ok: true,
    eligible_total,
    discount,
    affected_item_ids: eligibleLines.map((l) => l.item_id),
  };
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

export function hydrateCouponRules(row: any, links: {
  customers: Array<{ user_id: string }>;
  categories: Array<{ category_id: string; mode: "include" | "exclude" }>;
  products: Array<{ product_id: string; mode: "include" | "exclude" }>;
}): CouponRules {
  return {
    id: row.id,
    code: row.code,
    name: row.name ?? null,
    type: row.type,
    value: Number(row.value ?? 0),
    min_order_amount: Number(row.min_order_amount ?? 0),
    max_discount_per_order: row.max_discount_per_order != null ? Number(row.max_discount_per_order) : null,
    max_total_discount: row.max_total_discount != null ? Number(row.max_total_discount) : null,
    total_discount_used: Number(row.total_discount_used ?? 0),
    applies_to_all_customers: row.applies_to_all_customers !== false,
    applies_to_all_categories: row.applies_to_all_categories !== false,
    applies_to_all_products: row.applies_to_all_products !== false,
    stack_with_promotions: row.stack_with_promotions !== false,
    is_active: !!row.is_active,
    starts_at: row.starts_at ?? null,
    expires_at: row.expires_at ?? null,
    max_uses: row.max_uses ?? null,
    max_uses_per_user: row.max_uses_per_user ?? null,
    allowed_customers: new Set(links.customers.map((c) => c.user_id)),
    included_products: new Set(links.products.filter((p) => p.mode === "include").map((p) => p.product_id)),
    excluded_products: new Set(links.products.filter((p) => p.mode === "exclude").map((p) => p.product_id)),
    included_categories: new Set(links.categories.filter((c) => c.mode === "include").map((c) => c.category_id)),
    excluded_categories: new Set(links.categories.filter((c) => c.mode === "exclude").map((c) => c.category_id)),
  };
}
