import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { addDesignToCartSchema, designInputSchema } from "@/lib/labels/schema";
import {
  unitPriceForQuantity,
  type LabelLayer,
  type LabelShape,
  type PriceTier,
  type ProductLabelSpec,
} from "@/lib/labels/shared";

export type SavedDesign = {
  id: string;
  name: string;
  base_product_id: string | null;
  width_mm: number;
  height_mm: number;
  shape: LabelShape;
  corner_radius_mm: number | null;
  material: string;
  ribbon_color: string;
  background_color: string;
  layout: LabelLayer[];
  thumbnail: string | null;
  updated_at: string;
};

export type CustomizableProduct = ProductLabelSpec;


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

const SPEC_COLUMNS =
  "id, name, slug, custom_shape, custom_width_mm, custom_height_mm, custom_corner_radius_mm, custom_columns, custom_rows, custom_gap_x_mm, custom_gap_y_mm, custom_margin_mm, custom_safe_margin_mm, custom_notes";

/** Produtos-base marcados como personalizáveis no cadastro, com a ficha do mockup. */
export const listCustomizableProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<CustomizableProduct[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("products")
      .select(SPEC_COLUMNS)
      .in("status", ["enriched", "published"])
      .eq("is_available", true)
      .eq("is_customizable", true)
      .order("name", { ascending: true })
      .limit(200);
    return (data ?? []).map(toSpec);
  },
);

/** Ficha de personalização de um único produto (slug ou id vindo da página do produto). */
export const getCustomizableProduct = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }): Promise<CustomizableProduct | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.slug);
    const { data: row } = await supabaseAdmin
      .from("products")
      .select(SPEC_COLUMNS)
      .eq(isUuid ? "id" : "slug", data.slug)
      .eq("is_customizable", true)
      .maybeSingle();
    return row ? toSpec(row) : null;
  });

function toSpec(p: any): ProductLabelSpec {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    shape: (p.custom_shape ?? "rect") as LabelShape,
    width_mm: Number(p.custom_width_mm ?? 100),
    height_mm: Number(p.custom_height_mm ?? 50),
    corner_radius_mm: p.custom_corner_radius_mm == null ? null : Number(p.custom_corner_radius_mm),
    columns: Number(p.custom_columns ?? 1),
    rows: Number(p.custom_rows ?? 1),
    gap_x_mm: Number(p.custom_gap_x_mm ?? 3),
    gap_y_mm: Number(p.custom_gap_y_mm ?? 3),
    margin_mm: Number(p.custom_margin_mm ?? 2),
    safe_margin_mm: Number(p.custom_safe_margin_mm ?? 2),
    notes: p.custom_notes ?? null,
  };
}


export const listMyDesigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedDesign[]> => {
    const { data, error } = await context.supabase
      .from("label_designs")
      .select(
        "id, name, base_product_id, width_mm, height_mm, shape, corner_radius_mm, material, ribbon_color, background_color, layout, thumbnail, updated_at",
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
      shape: data.shape ?? "rect",
      corner_radius_mm: data.corner_radius_mm ?? null,
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
      .select("id, name, base_product_id, width_mm, height_mm, shape, corner_radius_mm, material, ribbon_color")
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
        shape: design.shape,
        material: design.material,
        ribbon_color: design.ribbon_color,
      },
    });
    if (insErr) throw new Error(insErr.message);

    return { ok: true, unit_price, total: Number((unit_price * data.quantity).toFixed(2)) };
  });
