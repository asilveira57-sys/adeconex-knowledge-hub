import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { evaluateCoupon, hydrateCouponRules, type CouponEvaluation, type CouponLine } from "./coupons.shared";

/**
 * Server fns para cupons de desconto.
 *
 * A validação e o cálculo de desconto SEMPRE rodam no servidor.
 * O front apenas exibe o resultado que já veio do snapshot do carrinho.
 */

/** Regras de cupom são dados internos: leitura só com cliente privilegiado no servidor. */
async function couponReader() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function loadCouponByCode(_supabase: any, code: string) {
  const normalized = code.trim();
  if (!normalized) return null;
  const admin = await couponReader();
  const { data } = await admin
    .from("coupons")
    .select("*")
    .ilike("code", normalized)
    .maybeSingle();
  return data ?? null;
}

async function loadCouponLinks(_supabase: any, couponId: string) {
  const admin = await couponReader();
  const [{ data: customers }, { data: categories }, { data: products }] = await Promise.all([
    admin.from("coupon_customers").select("user_id").eq("coupon_id", couponId),
    admin.from("coupon_categories").select("category_id, mode").eq("coupon_id", couponId),
    admin.from("coupon_products").select("product_id, mode").eq("coupon_id", couponId),
  ]);
  return {
    customers: (customers ?? []) as Array<{ user_id: string }>,
    categories: (categories ?? []) as Array<{ category_id: string; mode: "include" | "exclude" }>,
    products: (products ?? []) as Array<{ product_id: string; mode: "include" | "exclude" }>,
  };
}


/**
 * Retorna as linhas do carrinho ativas hoje anotadas com category_ids.
 * Só considera itens do carrinho do usuário.
 */
async function loadCartLinesForCoupon(supabase: any, userId: string): Promise<{
  cart_id: string | null;
  lines: CouponLine[];
}> {
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!cart) return { cart_id: null, lines: [] };

  const { data: items } = await supabase
    .from("cart_items")
    .select("id, product_id, variant_id, quantity, unit_price, metadata")
    .eq("cart_id", cart.id);
  const rows = items ?? [];
  if (rows.length === 0) return { cart_id: cart.id, lines: [] };

  const productIds = Array.from(new Set(rows.map((r: any) => r.product_id)));
  const { data: pcs } = await supabase
    .from("product_categories")
    .select("product_id, category_id")
    .in("product_id", productIds);
  const catMap = new Map<string, string[]>();
  for (const pc of pcs ?? []) {
    const list = catMap.get(pc.product_id) ?? [];
    list.push(pc.category_id);
    catMap.set(pc.product_id, list);
  }

  const lines: CouponLine[] = rows.map((r: any) => {
    const unit = Number(r.unit_price ?? 0);
    const qty = Number(r.quantity ?? 0);
    return {
      item_id: r.id,
      product_id: r.product_id,
      category_ids: catMap.get(r.product_id) ?? [],
      quantity: qty,
      unit_price: unit,
      line_total: Number((unit * qty).toFixed(2)),
      bundle_applied: !!r.metadata?.bundle?.offer_id,
    };
  });

  return { cart_id: cart.id, lines };
}

async function evaluateCode(supabase: any, code: string, userId: string): Promise<{
  ok: boolean;
  reason?: string;
  coupon?: {
    id: string;
    code: string;
    name: string | null;
    type: "percent" | "fixed" | "free_shipping";
    value: number;
  };
  evaluation?: CouponEvaluation;
}> {
  const row = await loadCouponByCode(supabase, code);
  if (!row) return { ok: false, reason: "Cupom não encontrado" };
  const links = await loadCouponLinks(supabase, row.id);
  const rules = hydrateCouponRules(row, links);

  const [{ count: usesTotal }, { count: usesUser }, cart] = await Promise.all([
    supabase.from("coupon_redemptions").select("*", { count: "exact", head: true })
      .eq("coupon_id", row.id).in("status", ["reservado", "confirmado"]),
    supabase.from("coupon_redemptions").select("*", { count: "exact", head: true })
      .eq("coupon_id", row.id).eq("user_id", userId).in("status", ["reservado", "confirmado"]),
    loadCartLinesForCoupon(supabase, userId),
  ]);

  if (cart.lines.length === 0) {
    return { ok: false, reason: "Carrinho vazio" };
  }

  const evaluation = evaluateCoupon({
    coupon: rules,
    lines: cart.lines,
    user_id: userId,
    uses_total: usesTotal ?? 0,
    uses_user: usesUser ?? 0,
  });

  return {
    ok: evaluation.ok,
    reason: evaluation.reason,
    coupon: {
      id: row.id,
      code: row.code,
      name: row.name ?? null,
      type: row.type,
      value: Number(row.value ?? 0),
    },
    evaluation,
  };
}

export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ code: z.string().min(1).max(80) }).parse(v))
  .handler(async ({ context, data }) => {
    return evaluateCode(context.supabase, data.code, context.userId);
  });

export const applyCouponToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ code: z.string().min(1).max(80) }).parse(v))
  .handler(async ({ context, data }) => {
    const result = await evaluateCode(context.supabase, data.code, context.userId);
    if (!result.ok) return { ok: false, reason: result.reason ?? "Cupom inválido" };
    const { data: cart } = await context.supabase
      .from("carts")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!cart) return { ok: false, reason: "Carrinho vazio" };
    const { error } = await context.supabase
      .from("carts")
      .update({ coupon_code: result.coupon!.code })
      .eq("id", cart.id);
    if (error) return { ok: false, reason: error.message };
    return { ok: true, code: result.coupon!.code };
  });

export const removeCouponFromCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: cart } = await context.supabase
      .from("carts")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!cart) return { ok: true };
    await context.supabase.from("carts").update({ coupon_code: null }).eq("id", cart.id);
    return { ok: true };
  });

/** Chamado a partir do finalizeSnapshot do carrinho para materializar o cupom
 *  já persistido em carts.coupon_code sem exigir round-trip do cliente.
 */
export async function computeCartCouponPreview(
  supabase: any,
  userId: string,
  couponCode: string | null,
  lines: CouponLine[],
): Promise<{
  code: string;
  name: string | null;
  discount: number;
  eligible_total: number;
  error: string | null;
} | null> {
  if (!couponCode) return null;
  const row = await loadCouponByCode(supabase, couponCode);
  if (!row) return { code: couponCode, name: null, discount: 0, eligible_total: 0, error: "Cupom não encontrado" };
  const links = await loadCouponLinks(supabase, row.id);
  const rules = hydrateCouponRules(row, links);

  const [{ count: usesTotal }, { count: usesUser }] = await Promise.all([
    supabase.from("coupon_redemptions").select("*", { count: "exact", head: true })
      .eq("coupon_id", row.id).in("status", ["reservado", "confirmado"]),
    supabase.from("coupon_redemptions").select("*", { count: "exact", head: true })
      .eq("coupon_id", row.id).eq("user_id", userId).in("status", ["reservado", "confirmado"]),
  ]);

  const evaluation = evaluateCoupon({
    coupon: rules,
    lines,
    user_id: userId,
    uses_total: usesTotal ?? 0,
    uses_user: usesUser ?? 0,
  });

  return {
    code: row.code,
    name: row.name ?? null,
    discount: evaluation.discount,
    eligible_total: evaluation.eligible_total,
    error: evaluation.ok ? null : (evaluation.reason ?? "Cupom inválido"),
  };
}

/** Usado pelo checkout (createOrder) para revalidar cupom + calcular
 *  desconto antes de gravar o pedido e chamar redeem_coupon.
 */
export async function evaluateCouponForCheckout(
  supabase: any,
  userId: string,
  couponCode: string | null,
  lines: CouponLine[],
) {
  if (!couponCode) return { code: null, discount: 0, eligible_total: 0 };
  const preview = await computeCartCouponPreview(supabase, userId, couponCode, lines);
  if (!preview || preview.error) {
    throw new Error(preview?.error ?? "Cupom inválido");
  }
  return { code: preview.code, discount: preview.discount, eligible_total: preview.eligible_total };
}
