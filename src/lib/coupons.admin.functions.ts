import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Admin CRUD de cupons de desconto. Somente staff (admin/editor). */

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export type CouponStatus = "ativo" | "agendado" | "expirado" | "esgotado" | "inativo";

export const COUPON_STATUSES: CouponStatus[] = ["ativo", "agendado", "expirado", "esgotado", "inativo"];

export const COUPON_STATUS_LABEL: Record<CouponStatus, string> = {
  ativo: "Ativo",
  agendado: "Agendado",
  expirado: "Expirado",
  esgotado: "Esgotado",
  inativo: "Inativo",
};

export function deriveCouponStatus(c: {
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  max_uses: number | null;
  max_total_discount: number | null;
  total_discount_used: number | null;
  uses: number;
}, now = new Date()): CouponStatus {
  if (!c.is_active) return "inativo";
  if (c.expires_at && new Date(c.expires_at) < now) return "expirado";
  if (c.max_uses != null && c.uses >= c.max_uses) return "esgotado";
  if (c.max_total_discount != null && Number(c.total_discount_used ?? 0) >= Number(c.max_total_discount))
    return "esgotado";
  if (c.starts_at && new Date(c.starts_at) > now) return "agendado";
  return "ativo";
}

const listInput = z.object({
  search: z.string().optional(),
  status: z.enum(["ativo", "agendado", "expirado", "esgotado", "inativo"]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const listAdminCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => listInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);

    let q = context.supabase
      .from("coupons")
      .select(
        "id, code, name, description, type, value, min_order_amount, max_discount_per_order, max_total_discount, total_discount_used, max_uses, max_uses_per_user, starts_at, expires_at, is_active, stack_with_promotions, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (data.search) {
      const s = data.search.replace(/[%,]/g, "");
      q = q.or(`code.ilike.%${s}%,name.ilike.%${s}%`);
    }

    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = (rows ?? []).map((r: { id: string }) => r.id);
    const usesById = new Map<string, number>();
    if (ids.length > 0) {
      const { data: reds } = await context.supabase
        .from("coupon_redemptions")
        .select("coupon_id, status")
        .in("coupon_id", ids);
      for (const r of reds ?? []) {
        if (r.status === "cancelado" || r.status === "estornado") continue;
        usesById.set(r.coupon_id, (usesById.get(r.coupon_id) ?? 0) + 1);
      }
    }

    let list = (rows ?? []).map((r: any) => {
      const uses = usesById.get(r.id) ?? 0;
      return { ...r, uses, status: deriveCouponStatus({ ...r, uses }) };
    });

    if (data.status) list = list.filter((r: any) => r.status === data.status);

    const total = list.length;
    const from = (data.page - 1) * data.pageSize;
    return { rows: list.slice(from, from + data.pageSize), total };
  });

const couponInput = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(2).max(60),
  name: z.string().max(120).nullable().optional(),
  description: z.string().max(500).nullable().optional(),
  type: z.enum(["percent", "fixed"]),
  value: z.number().min(0),
  min_order_amount: z.number().min(0).default(0),
  max_discount_per_order: z.number().min(0).nullable().optional(),
  max_total_discount: z.number().min(0).nullable().optional(),
  max_uses: z.number().int().min(1).nullable().optional(),
  max_uses_per_user: z.number().int().min(1).nullable().optional(),
  starts_at: z.string().nullable().optional(),
  expires_at: z.string().nullable().optional(),
  stack_with_promotions: z.boolean().default(true),
  is_active: z.boolean().default(true),
});

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => couponInput.parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const row = {
      code: data.code.trim().toUpperCase(),
      name: data.name || null,
      description: data.description || null,
      type: data.type,
      value: data.value,
      min_order_amount: data.min_order_amount,
      max_discount_per_order: data.max_discount_per_order ?? null,
      max_total_discount: data.max_total_discount ?? null,
      max_uses: data.max_uses ?? null,
      max_uses_per_user: data.max_uses_per_user ?? null,
      starts_at: data.starts_at || null,
      expires_at: data.expires_at || null,
      stack_with_promotions: data.stack_with_promotions,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await context.supabase.from("coupons").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: inserted, error } = await context.supabase
      .from("coupons")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const toggleCouponActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid(), is_active: z.boolean() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("coupons")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const duplicateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: src, error } = await context.supabase
      .from("coupons")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!src) throw new Error("Cupom não encontrado");

    const base = `${src.code}-COPIA`;
    let code = base;
    for (let i = 2; i < 50; i++) {
      const { data: exists } = await context.supabase
        .from("coupons")
        .select("id")
        .ilike("code", code)
        .maybeSingle();
      if (!exists) break;
      code = `${base}-${i}`;
    }

    const {
      id: _id,
      created_at: _c,
      updated_at: _u,
      total_discount_used: _t,
      ...rest
    } = src as Record<string, unknown>;

    const { data: inserted, error: insErr } = await context.supabase
      .from("coupons")
      .insert({ ...rest, code, name: src.name ? `${src.name} (cópia)` : null, is_active: false, total_discount_used: 0 })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);

    // copia vínculos
    for (const table of ["coupon_customers", "coupon_categories", "coupon_products"] as const) {
      const { data: links } = await context.supabase.from(table).select("*").eq("coupon_id", data.id);
      if (links && links.length > 0) {
        const clone = links.map((l: Record<string, unknown>) => {
          const { created_at: _cc, ...keep } = l;
          return { ...keep, coupon_id: inserted.id };
        });
        await context.supabase.from(table).insert(clone);
      }
    }

    return { ok: true, id: inserted.id };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { count, error: cErr } = await context.supabase
      .from("coupon_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", data.id);
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) > 0)
      throw new Error("Cupom já possui utilizações e não pode ser excluído. Desative-o.");

    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listCouponRedemptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ couponId: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("coupon_redemptions")
      .select("id, order_id, user_id, amount, status, original_total, final_total, created_at")
      .eq("coupon_id", data.couponId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const orderIds = [...new Set((rows ?? []).map((r: { order_id: string }) => r.order_id))];
    const numbers = new Map<string, string>();
    if (orderIds.length > 0) {
      const { data: orders } = await context.supabase
        .from("orders")
        .select("id, order_number")
        .in("id", orderIds);
      for (const o of orders ?? []) numbers.set(o.id, o.order_number);
    }

    const list = (rows ?? []).map((r: any) => ({ ...r, order_number: numbers.get(r.order_id) ?? null }));
    const confirmed = list.filter((r: any) => r.status !== "cancelado" && r.status !== "estornado");
    return {
      rows: list,
      stats: {
        uses: confirmed.length,
        customers: new Set(confirmed.map((r: any) => r.user_id)).size,
        discount_total: confirmed.reduce((s: number, r: any) => s + Number(r.amount || 0), 0),
        revenue_total: confirmed.reduce((s: number, r: any) => s + Number(r.final_total || 0), 0),
      },
    };
  });
