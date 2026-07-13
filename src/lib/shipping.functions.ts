import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Melhor Envio shipping quotes.
 *
 * Uses the sandbox endpoint by default. Prices are ALWAYS resolved server-side
 * and persisted in `shipping_quotes` with a short TTL — the client cannot
 * inject a price into the order.
 */

const MELHORENVIO_SANDBOX_URL = "https://sandbox.melhorenvio.com.br";
const MELHORENVIO_PROD_URL = "https://www.melhorenvio.com.br";
const QUOTE_TTL_MINUTES = 30;

// Sensible fallbacks when a product has no dimensions/weight configured
// (Melhor Envio requires min 11×2×11 cm and 30 g per box).
const DEFAULT_DIMENSIONS = { width: 11, height: 4, length: 16, weight: 0.3 };
const MIN_DIMENSIONS = { width: 11, height: 2, length: 11, weight: 0.03 };

export type ShippingOption = {
  quote_id: string;
  service_id: string;
  service_name: string;
  carrier: string;
  carrier_picture: string | null;
  price: number;
  deadline_days: number;
  expires_at: string;
};

function envOrigin(): string {
  return (process.env.MELHORENVIO_ORIGIN_CEP ?? "29106460").replace(/\D/g, "");
}

function apiBase(): string {
  const sandbox = (process.env.MELHORENVIO_SANDBOX ?? "true").toLowerCase() !== "false";
  return sandbox ? MELHORENVIO_SANDBOX_URL : MELHORENVIO_PROD_URL;
}

function normalizeCep(zip: string): string {
  return zip.replace(/\D/g, "");
}

async function loadCartForQuote(supabase: any, userId: string) {
  const { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!cart) throw new Error("Carrinho vazio");

  const { data: rows } = await supabase
    .from("cart_items")
    .select("id, product_id, variant_id, quantity, unit_price")
    .eq("cart_id", cart.id);
  const items = rows ?? [];
  if (items.length === 0) throw new Error("Carrinho vazio");

  const productIds = Array.from(new Set(items.map((r: any) => r.product_id)));
  const variantIds = Array.from(
    new Set(items.map((r: any) => r.variant_id).filter(Boolean) as string[]),
  );

  const [{ data: prods }, { data: variants }] = await Promise.all([
    supabase
      .from("products")
      .select("id, weight_kg, width_mm, height_mm, length_mm")
      .in("id", productIds),
    variantIds.length
      ? supabase
          .from("product_variants")
          .select("id, weight_kg, width_mm, height_mm, length_mm")
          .in("id", variantIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const productMap = new Map<string, any>((prods ?? []).map((p: any) => [p.id, p]));
  const variantMap = new Map<string, any>((variants ?? []).map((v: any) => [v.id, v]));

  const products = items.map((r: any) => {
    const p = productMap.get(r.product_id) ?? {};
    const v = r.variant_id ? variantMap.get(r.variant_id) ?? {} : {};
    const weight_kg = Number(v.weight_kg ?? p.weight_kg ?? DEFAULT_DIMENSIONS.weight);
    const width = Number(v.width_mm ?? p.width_mm ?? 0) / 10 || DEFAULT_DIMENSIONS.width;
    const height = Number(v.height_mm ?? p.height_mm ?? 0) / 10 || DEFAULT_DIMENSIONS.height;
    const length = Number(v.length_mm ?? p.length_mm ?? 0) / 10 || DEFAULT_DIMENSIONS.length;
    const insurance_value = Number((Number(r.unit_price) * r.quantity).toFixed(2));

    return {
      id: r.id,
      quantity: r.quantity as number,
      weight: Math.max(weight_kg, MIN_DIMENSIONS.weight),
      width: Math.max(Math.round(width), MIN_DIMENSIONS.width),
      height: Math.max(Math.round(height), MIN_DIMENSIONS.height),
      length: Math.max(Math.round(length), MIN_DIMENSIONS.length),
      insurance_value,
    };
  });

  return { cart_id: cart.id as string, products };
}

type MelhorEnvioService = {
  id: number;
  name: string;
  price?: string | number;
  custom_price?: string | number;
  delivery_time?: number;
  custom_delivery_time?: number;
  company?: { id: number; name: string; picture?: string };
  error?: string;
};

async function callMelhorEnvio(payload: unknown): Promise<MelhorEnvioService[]> {
  const token = process.env.MELHORENVIO_TOKEN;
  if (!token) throw new Error("MELHORENVIO_TOKEN não configurado");

  const res = await fetch(`${apiBase()}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent":
        process.env.MELHORENVIO_USER_AGENT ?? "Adeconex Ecommerce (comercial@adeconex.com.br)",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Melhor Envio ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as MelhorEnvioService[];
}

export const quoteShipping = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ address_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ context, data }): Promise<ShippingOption[]> => {
    // Resolve address (RLS enforces ownership)
    const { data: addr } = await context.supabase
      .from("customer_addresses")
      .select("id, zip")
      .eq("id", data.address_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!addr) throw new Error("Endereço não encontrado");

    const { cart_id, products } = await loadCartForQuote(context.supabase, context.userId);

    const origin = envOrigin();
    const destination = normalizeCep(addr.zip);
    if (!destination || destination.length !== 8) {
      throw new Error("CEP de destino inválido");
    }

    const services = await callMelhorEnvio({
      from: { postal_code: origin },
      to: { postal_code: destination },
      products,
      options: { receipt: false, own_hand: false, insurance_value: 0 },
    });

    const valid = services.filter(
      (s) => !s.error && (s.price ?? s.custom_price) != null,
    );
    if (valid.length === 0) return [];

    const expires_at = new Date(Date.now() + QUOTE_TTL_MINUTES * 60_000).toISOString();

    // Persist and return in a single pass
    const rows = valid.map((s) => ({
      user_id: context.userId,
      cart_id,
      provider: "melhorenvio",
      origin_zip: origin,
      destination_zip: destination,
      service_id: String(s.id),
      service_name: s.name,
      carrier: s.company?.name ?? s.name,
      price: Number(s.custom_price ?? s.price ?? 0),
      deadline_days: Number(s.custom_delivery_time ?? s.delivery_time ?? 0),
      raw: s as any,
      expires_at,
    }));

    const { data: inserted, error } = await (context.supabase as any)
      .from("shipping_quotes")
      .insert(rows)
      .select(
        "id, service_id, service_name, carrier, price, deadline_days, expires_at, raw",
      );
    if (error) throw new Error(error.message);

    return (inserted ?? []).map((q: any) => ({
      quote_id: q.id,
      service_id: q.service_id,
      service_name: q.service_name,
      carrier: q.carrier,
      carrier_picture: q.raw?.company?.picture ?? null,
      price: Number(q.price),
      deadline_days: Number(q.deadline_days),
      expires_at: q.expires_at,
    }));
  });
