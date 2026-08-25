import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Mercado Pago — cria pedido + preference server-side.
 *
 * REGRAS:
 * - Preços SEMPRE recalculados via cart + shipping_quote no servidor.
 * - Frete: pickup / quote_later => 0; carrier => valor persistido em
 *   shipping_quotes (não confia no snapshot local).
 * - Estoque só é baixado após confirmação via webhook (Fase 8+).
 * - external_reference da preference = order.id (usado pelo webhook).
 */

const MP_API = "https://api.mercadopago.com";

type ShippingOption = "pickup" | "quote_later" | "carrier";

export type CreatePreferenceResult = {
  order_id: string;
  order_number: string;
  preference_id: string;
  /** URL correta conforme o token: produção (APP_USR-) => init_point; teste (TEST-) => sandbox_init_point */
  checkout_url: string;
  init_point: string;
  sandbox_init_point: string | null;
  is_sandbox: boolean;
  total: number;
};

async function resolveShipping(
  supabase: any,
  userId: string,
  option: ShippingOption,
  quoteId: string | null,
): Promise<{
  total: number;
  carrier: string | null;
  service: string | null;
  deadline: number | null;
  quote_id: string | null;
}> {
  if (option === "pickup") {
    return { total: 0, carrier: "Retirada", service: "Retirar em Vila Velha (ES)", deadline: 1, quote_id: null };
  }
  if (option === "quote_later") {
    return { total: 0, carrier: null, service: "Frete a combinar", deadline: null, quote_id: null };
  }
  if (!quoteId) throw new Error("Selecione uma opção de frete válida");
  const { data: q } = await supabase
    .from("shipping_quotes")
    .select("id, price, carrier, service_name, deadline_days, expires_at, user_id")
    .eq("id", quoteId)
    .maybeSingle();
  if (!q || q.user_id !== userId) throw new Error("Cotação de frete não encontrada");
  if (q.expires_at && new Date(q.expires_at).getTime() < Date.now()) {
    throw new Error("Cotação de frete expirada. Recote o frete.");
  }
  return {
    total: Number(q.price),
    carrier: q.carrier,
    service: q.service_name,
    deadline: q.deadline_days,
    quote_id: q.id,
  };
}

export const createOrderAndPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        address_id: z.string().uuid(),
        billing_company_id: z.string().uuid().nullable().optional(),
        shipping_option: z.enum(["pickup", "quote_later", "carrier"]),
        shipping_quote_id: z.string().uuid().nullable().optional(),
        customer_notes: z.string().max(1000).optional(),
        origin: z.string().url().optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }): Promise<CreatePreferenceResult> => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado");

    const supabase = context.supabase;

    // 1) Endereço (RLS)
    const { data: addr } = await supabase
      .from("customer_addresses")
      .select(
        "id, label, recipient_name, recipient_document, zip, street, number, complement, district, city, state, country",
      )
      .eq("id", data.address_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!addr) throw new Error("Endereço não encontrado");

    // 2) Empresa (opcional)
    let company: any = null;
    if (data.billing_company_id) {
      const { data: c } = await supabase
        .from("companies")
        .select("id, cnpj, legal_name, trade_name")
        .eq("id", data.billing_company_id)
        .eq("user_id", context.userId)
        .maybeSingle();
      if (!c) throw new Error("Empresa não encontrada");
      company = c;
    }

    // 3) Carrinho + itens (recalculando preços)
    const { data: cart } = await supabase
      .from("carts")
      .select("id, currency, coupon_code")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();
    if (!cart) throw new Error("Carrinho vazio");

    const { data: rows } = await supabase
      .from("cart_items")
      .select("id, product_id, variant_id, quantity, unit_price, metadata")
      .eq("cart_id", cart.id);
    const cartRows = rows ?? [];
    if (cartRows.length === 0) throw new Error("Carrinho vazio");

    const productIds = Array.from(new Set(cartRows.map((r: any) => r.product_id)));
    const variantIds = Array.from(
      new Set(cartRows.map((r: any) => r.variant_id).filter(Boolean) as string[]),
    );

    const [{ data: prods }, { data: variants }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, slug, sku, price, promotional_price, weight_kg, is_available, stock_quantity")
        .in("id", productIds),
      variantIds.length
        ? supabase
            .from("product_variants")
            .select(
              "id, sku, price, promotional_price, weight_kg, stock_quantity, option1_name, option1_value, option2_name, option2_value",
            )
            .in("id", variantIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const pMap = new Map<string, any>((prods ?? []).map((p: any) => [p.id, p]));
    const vMap = new Map<string, any>((variants ?? []).map((v: any) => [v.id, v]));

    type Prepared = {
      product_id: string;
      variant_id: string | null;
      product_name: string;
      product_sku: string | null;
      variant_label: string | null;
      quantity: number;
      unit_price: number;
      subtotal: number;
      weight_kg: number | null;
      metadata: Record<string, unknown>;
    };

    // Etiquetas personalizadas usam a tabela de preço por quantidade
    const hasCustom = cartRows.some((r: any) => r.metadata?.custom_label);
    let customTiers: { min_quantity: number; unit_price: number }[] = [];
    if (hasCustom) {
      const { data: tierRows } = await supabase
        .from("custom_label_price_tiers")
        .select("min_quantity, unit_price")
        .eq("is_active", true);
      customTiers = (tierRows ?? []).map((t: any) => ({
        min_quantity: Number(t.min_quantity),
        unit_price: Number(t.unit_price),
      }));
      if (customTiers.length === 0) throw new Error("Tabela de preços da etiqueta personalizada indisponível");
    }
    const { unitPriceForQuantity } = await import("./labels/shared");

    const items: Prepared[] = cartRows.map((r: any) => {
      const p = pMap.get(r.product_id);
      if (!p) throw new Error("Produto do carrinho não encontrado");
      if (!p.is_available) throw new Error(`"${p.name}" está indisponível`);
      const v = r.variant_id ? vMap.get(r.variant_id) : null;
      const meta = (r.metadata ?? {}) as Record<string, any>;
      const isCustom = !!meta.custom_label;
      const unit = isCustom
        ? Number(unitPriceForQuantity(customTiers, Number(r.quantity)).toFixed(4))
        : Number(v?.promotional_price ?? v?.price ?? p.promotional_price ?? p.price ?? 0);
      if (unit <= 0) throw new Error(`"${p.name}" está sem preço configurado`);
      const label = isCustom
        ? `Personalizada: ${meta.design_name ?? "modelo"} · ${meta.width_mm}×${meta.height_mm} mm`
        : v
          ? [
              v.option1_name && v.option1_value ? `${v.option1_name}: ${v.option1_value}` : null,
              v.option2_name && v.option2_value ? `${v.option2_name}: ${v.option2_value}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || null
          : null;
      return {
        product_id: p.id,
        variant_id: r.variant_id ?? null,
        product_name: isCustom ? `${p.name} (personalizada)` : p.name,
        product_sku: v?.sku ?? p.sku ?? null,
        variant_label: label,
        quantity: Number(r.quantity),
        unit_price: Number(unit.toFixed(2)),
        subtotal: Number((unit * r.quantity).toFixed(2)),
        weight_kg: v?.weight_kg ?? p.weight_kg ?? null,
        metadata: meta,
      };
    });

    const subtotal = Number(items.reduce((s, i) => s + i.subtotal, 0).toFixed(2));

    // 4) Frete
    const ship = await resolveShipping(
      supabase,
      context.userId,
      data.shipping_option,
      data.shipping_quote_id ?? null,
    );

    // 4.1) Cupom (revalida server-side)
    let couponDiscount = 0;
    let couponEligibleTotal = 0;
    let couponCodeApplied: string | null = null;
    if ((cart as any).coupon_code) {
      const { evaluateCouponForCheckout } = await import("./coupons.functions");
      const evalLines = items.map((i, idx) => ({
        item_id: `pending-${idx}`,
        product_id: i.product_id,
        category_ids: [] as string[],
        quantity: i.quantity,
        unit_price: i.unit_price,
        line_total: i.subtotal,
      }));
      // Categorias dos produtos elegíveis
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
      for (const l of evalLines) l.category_ids = catMap.get(l.product_id) ?? [];
      try {
        const cp = await evaluateCouponForCheckout(
          supabase,
          context.userId,
          (cart as any).coupon_code,
          evalLines,
        );
        couponDiscount = cp.discount;
        couponEligibleTotal = cp.eligible_total;
        couponCodeApplied = cp.code;
      } catch (e: any) {
        throw new Error(`Cupom não pode ser aplicado: ${e?.message ?? "erro desconhecido"}`);
      }
    }

    const total = Number((subtotal + ship.total - couponDiscount).toFixed(2));

    // 5) Cria pedido (aguardando_pagamento) — order_number via trigger/default
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: context.userId,
        company_id: company?.id ?? null,
        status: "aguardando_pagamento",
        currency: cart.currency ?? "BRL",
        subtotal,
        shipping_total: ship.total,
        discount_total: couponDiscount,
        tax_total: 0,
        total,
        coupon_code: couponCodeApplied,
        shipping_carrier: ship.carrier,
        shipping_service: ship.service,
        shipping_deadline_days: ship.deadline,
        shipping_quote_id: ship.quote_id,
        customer_notes: data.customer_notes ?? null,
        requires_art: items.some((i) => /arte|imprim/i.test(i.product_name)),
        metadata: {
          shipping_option: data.shipping_option,
          coupon: couponCodeApplied
            ? { code: couponCodeApplied, discount: couponDiscount, eligible_total: couponEligibleTotal }
            : null,
        },
      })
      .select("id, order_number, total")
      .single();
    if (orderErr) throw new Error(orderErr.message);

    // 5.1) Registra resgate do cupom (reservado) — se falhar, aborta o pedido
    if (couponCodeApplied) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: redErr } = await (supabaseAdmin as any).rpc("redeem_coupon", {
        _coupon_code: couponCodeApplied,
        _order_id: order.id,
        _user_id: context.userId,
        _original_total: subtotal,
        _eligible_total: couponEligibleTotal,
        _discount: couponDiscount,
        _final_total: total,
      });
      if (redErr) {
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(`Cupom recusado: ${redErr.message}`);
      }
    }

    // 6) Itens do pedido
    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        variant_id: i.variant_id,
        product_name: i.product_name,
        product_sku: i.product_sku,
        variant_label: i.variant_label,
        quantity: i.quantity,
        unit_price: i.unit_price,
        subtotal: i.subtotal,
        weight_kg: i.weight_kg,
        requires_art: !!i.metadata?.custom_label,
        metadata: (i.metadata ?? {}) as never,
      })),
    );
    if (itemsErr) throw new Error(itemsErr.message);

    // 7) Endereço snapshot
    const { error: addrErr } = await supabase.from("order_addresses").insert({
      order_id: order.id,
      kind: "shipping",
      recipient_name: addr.recipient_name,
      recipient_document: addr.recipient_document,
      zip: addr.zip,
      street: addr.street,
      number: addr.number,
      complement: addr.complement,
      district: addr.district,
      city: addr.city,
      state: addr.state,
      country: addr.country ?? "BR",
      phone: null,
    });
    if (addrErr) throw new Error(addrErr.message);

    // 8) Histórico
    await supabase.from("order_status_history").insert({
      order_id: order.id,
      to_status: "aguardando_pagamento",
      changed_by: context.userId,
      comment: "Pedido criado",
    });

    // 9) Cria preference no Mercado Pago
    const rawOrigin =
      data.origin ??
      process.env.SITE_URL ??
      process.env.PUBLIC_SITE_URL ??
      "https://adeconex.com.br";
    const origin = rawOrigin.replace(/\/$/, "");
    // Mercado Pago rejeita back_urls apontando para localhost / 127.0.0.1
    // Nesse caso ficamos sem back_urls e sem auto_return (MP mostra o botão "Voltar ao site" desativado, mas cria a preferência).
    const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(origin);
    const backUrls = isLocal
      ? undefined
      : {
          success: `${origin}/pagamento/aprovado?order_id=${order.id}`,
          pending: `${origin}/pagamento/pendente?order_id=${order.id}`,
          failure: `${origin}/pagamento/recusado?order_id=${order.id}`,
        };

    const prefBody: Record<string, unknown> = {
      items: [
        ...items.map((i) => ({
          id: i.product_id,
          title: `${i.product_name}${i.variant_label ? ` — ${i.variant_label}` : ""}`.slice(0, 250),
          quantity: i.quantity,
          currency_id: "BRL",
          unit_price: i.unit_price,
        })),
        ...(ship.total > 0
          ? [
              {
                id: "shipping",
                title: `Frete — ${ship.carrier ?? ""} ${ship.service ?? ""}`.trim(),
                quantity: 1,
                currency_id: "BRL",
                unit_price: ship.total,
              },
            ]
          : []),
      ],
      external_reference: order.id,
      statement_descriptor: "ADECONEX",
      notification_url: `${origin}/api/public/webhooks/mercadopago`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        user_id: context.userId,
      },
    };
    if (backUrls) {
      prefBody.back_urls = backUrls;
      prefBody.auto_return = "approved";
    }

    const prefRes = await fetch(`${MP_API}/checkout/preferences`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(prefBody),
    });
    const prefJson: any = await prefRes.json().catch(() => ({}));
    if (!prefRes.ok || !prefJson?.id) {
      const detail =
        prefJson?.message ??
        prefJson?.error ??
        (prefJson?.cause && JSON.stringify(prefJson.cause)) ??
        "falha ao criar preferência";
      throw new Error(`Mercado Pago ${prefRes.status}: ${detail}`);
    }

    // 10) Grava payment (pending)
    await supabase.from("payments").insert({
      order_id: order.id,
      provider: "mercadopago",
      preference_id: prefJson.id,
      status: "pending",
      amount: total,
      currency: cart.currency ?? "BRL",
      raw: { preference: prefJson },
    });

    // 11) Fecha carrinho
    await supabase.from("carts").update({ status: "converted" }).eq("id", cart.id);

    // Token TEST- => sandbox; APP_USR- => produção
    const isSandbox = token.startsWith("TEST-");
    const checkoutUrl = isSandbox
      ? (prefJson.sandbox_init_point ?? prefJson.init_point)
      : prefJson.init_point;

    return {
      order_id: order.id,
      order_number: order.order_number,
      preference_id: prefJson.id,
      checkout_url: checkoutUrl,
      init_point: prefJson.init_point,
      sandbox_init_point: prefJson.sandbox_init_point ?? null,
      is_sandbox: isSandbox,
      total,
    };
  });

export type OrderPaymentStatus = {
  order_id: string;
  order_number: string;
  total: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  paid_at: string | null;
};

export const getOrderPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ order_id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<OrderPaymentStatus> => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, order_number, total, status, paid_at, payment_method")
      .eq("id", data.order_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!order) throw new Error("Pedido não encontrado");

    const { data: pay } = await context.supabase
      .from("payments")
      .select("status")
      .eq("order_id", order.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      order_id: order.id,
      order_number: order.order_number,
      total: Number(order.total),
      status: order.status as string,
      payment_status: (pay?.status as string | null) ?? null,
      payment_method: (order.payment_method as string | null) ?? null,
      paid_at: order.paid_at as string | null,
    };
  });
