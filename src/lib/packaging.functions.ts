import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Embalagens (caixas) cadastradas — usadas para preencher a cotação de frete. */

export type PackagingBox = {
  id: string;
  name: string;
  width_mm: number;
  height_mm: number;
  length_mm: number;
  suggested_weight_kg: number | null;
  notes: string | null;
  is_active: boolean;
  sort_order: number;
};

type Ctx = { supabase: any; userId: string };

async function assertStaff(context: Ctx) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listPackagingBoxes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PackagingBox[]> => {
    await assertStaff(context as Ctx);
    const { data, error } = await (context as Ctx).supabase
      .from("packaging_boxes")
      .select("id, name, width_mm, height_mm, length_mm, suggested_weight_kg, notes, is_active, sort_order")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as PackagingBox[];
  });

const boxInput = z.object({
  name: z.string().trim().min(2).max(120),
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  length_mm: z.number().positive(),
  suggested_weight_kg: z.number().positive().nullable(),
  notes: z.string().trim().max(300).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const createPackagingBox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => boxInput.parse(v))
  .handler(async ({ data, context }): Promise<PackagingBox> => {
    await assertStaff(context as Ctx);
    const { data: row, error } = await (context as Ctx).supabase
      .from("packaging_boxes")
      .insert({
        name: data.name,
        width_mm: data.width_mm,
        height_mm: data.height_mm,
        length_mm: data.length_mm,
        suggested_weight_kg: data.suggested_weight_kg,
        notes: data.notes ?? null,
        is_active: data.is_active ?? true,
        sort_order: data.sort_order ?? 0,
      })
      .select("id, name, width_mm, height_mm, length_mm, suggested_weight_kg, notes, is_active, sort_order")
      .single();
    if (error) throw new Error(error.message);
    return row as PackagingBox;
  });

export const deletePackagingBox = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context as Ctx);
    const { error } = await (context as Ctx).supabase
      .from("packaging_boxes")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
