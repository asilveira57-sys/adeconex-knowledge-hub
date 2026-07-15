import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export const ORDER_STATUSES: OrderStatus[] = [
  "draft",
  "aguardando_pagamento",
  "pago",
  "em_preparacao",
  "aguardando_arte",
  "arte_aprovada",
  "em_producao",
  "enviado",
  "entregue",
  "cancelado",
  "estornado",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Rascunho",
  aguardando_pagamento: "Aguardando pagamento",
  pago: "Pago",
  em_preparacao: "Em preparação",
  aguardando_arte: "Aguardando arte",
  arte_aprovada: "Arte aprovada",
  em_producao: "Em produção",
  enviado: "Enviado",
  entregue: "Entregue",
  cancelado: "Cancelado",
  estornado: "Estornado",
};

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ---------------- CUSTOMER ----------------

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, order_number, status, total, currency, created_at, paid_at, shipping_carrier, shipping_service",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });

export const getMyOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ orderId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado");

    const [itemsRes, addrsRes, historyRes, paymentsRes, shipmentsRes] = await Promise.all([
      context.supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id)
        .order("created_at"),
      context.supabase.from("order_addresses").select("*").eq("order_id", order.id),
      context.supabase
        .from("order_status_history")
        .select("id, from_status, to_status, comment, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true }),
      context.supabase
        .from("payments")
        .select("id, provider, status, method, amount, currency, external_id, preference_id, created_at, updated_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("shipments")
        .select("id, carrier, service, status, tracking_code, tracking_url, label_url, posted_at, delivered_at, created_at")
        .eq("order_id", order.id)
        .order("created_at", { ascending: false }),
    ]);

    return {
      order,
      items: itemsRes.data ?? [],
      addresses: addrsRes.data ?? [],
      history: historyRes.data ?? [],
      payments: paymentsRes.data ?? [],
      shipments: shipmentsRes.data ?? [],
    };
  });

// ---------------- ADMIN ----------------

const adminListInput = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const listAdminOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => adminListInput.parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = context.supabase
      .from("orders")
      .select(
        "id, order_number, status, total, currency, created_at, paid_at, shipping_carrier, user_id, requires_art",
        { count: "estimated" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status && data.status !== "all") q = q.eq("status", data.status as OrderStatus);
    if (data.search) q = q.ilike("order_number", `%${data.search}%`);
    const { data: rows, count, error } = await q;
    if (error) throw new Error(error.message);

    // Buscar nome/email dos clientes em lote
    const userIds = Array.from(new Set((rows ?? []).map((r: any) => r.user_id)));
    let profiles: Record<string, { full_name: string | null }> = {};
    if (userIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);
      profiles = Object.fromEntries((profs ?? []).map((p: any) => [p.id, { full_name: p.full_name }]));
    }
    return {
      rows: (rows ?? []).map((r: any) => ({ ...r, customer_name: profiles[r.user_id]?.full_name ?? null })),
      total: count ?? 0,
    };
  });

export const getAdminOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ orderId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: order, error } = await context.supabase
      .from("orders")
      .select("*")
      .eq("id", data.orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Pedido não encontrado");

    const [itemsRes, addrsRes, historyRes, paymentsRes, shipmentsRes, profileRes, companyRes] =
      await Promise.all([
        context.supabase.from("order_items").select("*").eq("order_id", order.id).order("created_at"),
        context.supabase.from("order_addresses").select("*").eq("order_id", order.id),
        context.supabase
          .from("order_status_history")
          .select("id, from_status, to_status, comment, created_at, changed_by")
          .eq("order_id", order.id)
          .order("created_at", { ascending: true }),
        context.supabase.from("payments").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
        context.supabase.from("shipments").select("*").eq("order_id", order.id).order("created_at", { ascending: false }),
        context.supabase.from("profiles").select("id, full_name, phone, whatsapp, cpf").eq("id", order.user_id).maybeSingle(),
        order.company_id
          ? context.supabase.from("companies").select("id, legal_name, trade_name, cnpj").eq("id", order.company_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

    // e-mail via admin (não vaza p/ front — só p/ staff)
    let customer_email: string | null = null;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      customer_email = u.user?.email ?? null;
    } catch {}

    return {
      order,
      items: itemsRes.data ?? [],
      addresses: addrsRes.data ?? [],
      history: historyRes.data ?? [],
      payments: paymentsRes.data ?? [],
      shipments: shipmentsRes.data ?? [],
      customer: { ...(profileRes.data ?? {}), email: customer_email },
      company: companyRes.data ?? null,
    };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        orderId: z.string().uuid(),
        status: z.enum(ORDER_STATUSES as [OrderStatus, ...OrderStatus[]]),
        comment: z.string().max(500).optional(),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: current } = await context.supabase
      .from("orders")
      .select("status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!current) throw new Error("Pedido não encontrado");

    const patch: Record<string, unknown> = { status: data.status };
    if (data.status === "pago" && current.status !== "pago") patch.paid_at = new Date().toISOString();
    if (data.status === "enviado") patch.shipped_at = new Date().toISOString();
    if (data.status === "entregue") patch.delivered_at = new Date().toISOString();
    if (data.status === "cancelado") patch.cancelled_at = new Date().toISOString();

    const { error: uErr } = await context.supabase.from("orders").update(patch).eq("id", data.orderId);
    if (uErr) throw new Error(uErr.message);

    await context.supabase.from("order_status_history").insert({
      order_id: data.orderId,
      from_status: current.status,
      to_status: data.status,
      changed_by: context.userId,
      comment: data.comment ?? null,
    });
    return { ok: true };
  });

export const updateOrderTracking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        orderId: z.string().uuid(),
        carrier: z.string().min(1).max(100),
        service: z.string().max(120).optional().nullable(),
        tracking_code: z.string().min(1).max(120),
        tracking_url: z.string().url().optional().nullable(),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: existing } = await context.supabase
      .from("shipments")
      .select("id")
      .eq("order_id", data.orderId)
      .maybeSingle();

    const payload = {
      order_id: data.orderId,
      provider: "manual",
      carrier: data.carrier,
      service: data.service ?? null,
      tracking_code: data.tracking_code,
      tracking_url: data.tracking_url ?? null,
      status: "posted",
      posted_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await context.supabase.from("shipments").update(payload).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("shipments").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateOrderInternalNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z.object({ orderId: z.string().uuid(), internal_notes: z.string().max(2000) }).parse(v),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ internal_notes: data.internal_notes })
      .eq("id", data.orderId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
