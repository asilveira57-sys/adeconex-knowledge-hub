import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public shipping quote preview by CEP.
 *
 * Used on the product page (like Tray) to give the customer a shipping
 * estimate for a given quantity BEFORE adding to cart or logging in.
 * Does NOT persist quotes — real checkout still calls `quoteShipping`.
 */

const MELHORENVIO_SANDBOX_URL = "https://sandbox.melhorenvio.com.br";
const MELHORENVIO_PROD_URL = "https://www.melhorenvio.com.br";

const DEFAULT_DIMENSIONS = { width: 11, height: 4, length: 16, weight: 0.3 };
const MIN_DIMENSIONS = { width: 11, height: 2, length: 11, weight: 0.03 };

export type ShippingPreviewOption = {
  service_id: string;
  service_name: string;
  carrier: string;
  carrier_picture: string | null;
  price: number;
  deadline_days: number;
};

export type ShippingPreviewResult = {
  destination_zip: string;
  options: ShippingPreviewOption[];
  errors: string[];
};

function envOrigin(): string {
  return (process.env.MELHORENVIO_ORIGIN_CEP ?? "29106460").replace(/\D/g, "");
}

function apiBase(): string {
  const sandbox = (process.env.MELHORENVIO_SANDBOX ?? "true").toLowerCase() !== "false";
  return sandbox ? MELHORENVIO_SANDBOX_URL : MELHORENVIO_PROD_URL;
}

export const previewShippingByCep = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid().nullable().optional(),
        quantity: z.number().int().min(1).max(999),
        zip: z.string().min(8).max(9),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<ShippingPreviewResult> => {
    const destination = data.zip.replace(/\D/g, "");
    if (destination.length !== 8) {
      throw new Error("CEP inválido");
    }

    const token = process.env.MELHORENVIO_TOKEN;
    if (!token) throw new Error("MELHORENVIO_TOKEN não configurado");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: product }, variantRes] = await Promise.all([
      supabaseAdmin
        .from("products")
        .select("id, price, promotional_price, weight_kg, width_mm, height_mm, length_mm")
        .eq("id", data.product_id)
        .maybeSingle(),
      data.variant_id
        ? supabaseAdmin
            .from("product_variants")
            .select("id, price, promotional_price, weight_kg, width_mm, height_mm, length_mm")
            .eq("id", data.variant_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
    ]);

    if (!product) throw new Error("Produto não encontrado");
    const variant = variantRes.data;

    let weight_kg = Number(variant?.weight_kg ?? product.weight_kg ?? DEFAULT_DIMENSIONS.weight);
    if (weight_kg > 30) weight_kg = weight_kg / 1000;
    weight_kg = Math.min(weight_kg, 30);
    const width =
      Number(variant?.width_mm ?? product.width_mm ?? 0) / 10 || DEFAULT_DIMENSIONS.width;
    const height =
      Number(variant?.height_mm ?? product.height_mm ?? 0) / 10 || DEFAULT_DIMENSIONS.height;
    const length =
      Number(variant?.length_mm ?? product.length_mm ?? 0) / 10 || DEFAULT_DIMENSIONS.length;

    const unitPrice = Number(
      variant?.promotional_price ?? variant?.price ?? product.promotional_price ?? product.price ?? 0,
    );

    const payloadProduct = {
      id: product.id,
      quantity: data.quantity,
      weight: Math.max(weight_kg, MIN_DIMENSIONS.weight),
      width: Math.max(Math.round(width), MIN_DIMENSIONS.width),
      height: Math.max(Math.round(height), MIN_DIMENSIONS.height),
      length: Math.max(Math.round(length), MIN_DIMENSIONS.length),
      insurance_value: Number((unitPrice * data.quantity).toFixed(2)),
    };

    const res = await fetch(`${apiBase()}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent":
          process.env.MELHORENVIO_USER_AGENT ??
          "Adeconex Ecommerce (comercial@adeconex.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: envOrigin() },
        to: { postal_code: destination },
        products: [payloadProduct],
        options: { receipt: false, own_hand: false, insurance_value: 0 },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Melhor Envio ${res.status}: ${text.slice(0, 200)}`);
    }

    const services = (await res.json()) as Array<{
      id: number;
      name: string;
      price?: string | number;
      custom_price?: string | number;
      delivery_time?: number;
      custom_delivery_time?: number;
      company?: { name: string; picture?: string };
      error?: string;
    }>;

    const options: ShippingPreviewOption[] = [];
    const errors: string[] = [];

    for (const s of services) {
      if (s.error) {
        errors.push(`${s.company?.name ?? s.name}: ${s.error}`);
        continue;
      }
      const price = Number(s.custom_price ?? s.price ?? 0);
      if (!price) continue;
      options.push({
        service_id: String(s.id),
        service_name: s.name,
        carrier: s.company?.name ?? s.name,
        carrier_picture: s.company?.picture ?? null,
        price,
        deadline_days: Number(s.custom_delivery_time ?? s.delivery_time ?? 0),
      });
    }

    options.sort((a, b) => a.price - b.price);

    return { destination_zip: destination, options, errors };
  });
