import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addDesignToCartSchema, designInputSchema } from "@/lib/labels/schema";
import { unitPriceForQuantity, type LabelLayer, type PriceTier } from "@/lib/labels/shared";

export type SavedDesign = {
  id: string;
  name: string;
  base_product_id: string | null;
  width_mm: number;
  height_mm: number;
  material: string;
  ribbon_color: string;
  background_color: string;
  layout: LabelLayer[];
  thumbnail: string | null;
  updated_at: string;
};

export type CustomizableProduct = { id: string; name: string; slug: string };

/** Faixas de preço da etiqueta personalizada (leitura pública). */
export const getLabelPricing = createServerFn({ method: "GET" }).handler(
  async (): Promise<PriceTier[]> => {
    const client = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await client
      .from("custom_label_price_tiers")
      .select("min_quantity, unit_price")
      .eq("is_active", true)
      .order("min_quantity", { ascending: true });
    return (data ?? []).map((t: { min_quantity: number; unit_price: number }) => ({
      min_quantity: Number(t.min_quantity),
      unit_price: Number(t.unit_price),
    }));
  },
);

/** Produtos-base que podem receber personalização (etiquetas em branco). */
export const listCustomizableProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomizableProduct[]> => {
    const client = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await client
      .from("products")
      .select("id, name, slug")
      .eq("is_available", true)
      .ilike("name", "%etiqueta%")
      .order("name", { ascending: true })
      .limit(120);
    return (data ?? []) as CustomizableProduct[];
  },
);

export const listMyDesigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedDesign[]> => {
    const { data, error } = await context.supabase
      .from("label_designs")
      .select(
        "id, name, base_product_id, width_mm, height_mm, material, ribbon_color, background_color, layout, thumbnail, updated_at",
      )
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as SavedDesign[];
  });

export const saveDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => designInputSchema.parse(data))
  .handler(async ({ context, data }): Promise<{ id: string }> => {
    const payload = {
      user_id: context.userId,
      name: data.name,
      base_product_id: data.base_product_id ?? null,
      width_mm: data.width_mm,
      height_mm: data.height_mm,
      material: data.material,
      ribbon_color: data.ribbon_color,
      background_color: data.background_color,
      layout: data.layout,
      thumbnail: data.thumbnail ?? null,
    };

    if (data.id) {
      const { data: row, error } = await context.supabase
        .from("label_designs")
        .update(payload)
        .eq("id", data.id)
        .eq("user_id", context.userId)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return { id: row.id };
    }

    const { data: row, error } = await context.supabase
      .from("label_designs")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDesign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("label_designs")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Adiciona um modelo salvo ao carrinho com preço da tabela por quantidade. */
export const addDesignToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addDesignToCartSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { data: design, error: designErr } = await context.supabase
      .from("label_designs")
      .select("id, name, base_product_id, width_mm, height_mm, material, ribbon_color")
      .eq("id", data.design_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (designErr) throw new Error(designErr.message);
    if (!design) throw new Error("Modelo não encontrado");
    if (!design.base_product_id) {
      throw new Error("Escolha o produto-base (etiqueta em branco) antes de adicionar ao carrinho");
    }

    const { data: tiers } = await context.supabase
      .from("custom_label_price_tiers")
      .select("min_quantity, unit_price")
      .eq("is_active", true);
    const list: PriceTier[] = (tiers ?? []).map((t: { min_quantity: number; unit_price: number }) => ({
      min_quantity: Number(t.min_quantity),
      unit_price: Number(t.unit_price),
    }));
    if (list.length === 0) throw new Error("Tabela de preços indisponível no momento");
    const unit_price = Number(unitPriceForQuantity(list, data.quantity).toFixed(4));
    if (unit_price <= 0) throw new Error("Preço indisponível para essa quantidade");

    const { data: existingCart } = await context.supabase
      .from("carts")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "active")
      .maybeSingle();

    let cartId = existingCart?.id as string | undefined;
    if (!cartId) {
      const { data: created, error } = await context.supabase
        .from("carts")
        .insert({ user_id: context.userId, status: "active" })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      cartId = created.id;
    }

    const { error: insErr } = await context.supabase.from("cart_items").insert({
      cart_id: cartId,
      product_id: design.base_product_id,
      variant_id: null,
      quantity: data.quantity,
      unit_price,
      metadata: {
        custom_label: true,
        design_id: design.id,
        design_name: design.name,
        width_mm: Number(design.width_mm),
        height_mm: Number(design.height_mm),
        material: design.material,
        ribbon_color: design.ribbon_color,
      },
    });
    if (insErr) throw new Error(insErr.message);

    return { ok: true, unit_price, total: Number((unit_price * data.quantity).toFixed(2)) };
  });
