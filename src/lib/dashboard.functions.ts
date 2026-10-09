import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPermissions } from "./staff.functions";

const PAID_EXCLUDED = new Set(["cancelado", "estornado"]);
const DAY = 86_400_000;

async function fetchAll<T>(build: (from: number, to: number) => any, max = 50_000): Promise<T[]> {
  const out: T[] = [];
  const size = 1000;
  for (let i = 0; i < max; i += size) {
    const { data, error } = await build(i, i + size - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

function dayKey(iso: string) {
  // Dia em horário de Brasília
  return new Date(new Date(iso).getTime() - 3 * 3600_000).toISOString().slice(0, 10);
}

function sourceOf(ref: string | null, utm: string | null) {
  const s = `${utm ?? ""} ${ref ?? ""}`.toLowerCase();
  if (!s.trim()) return "Direto";
  if (/google/.test(s)) return "Google";
  if (/instagram/.test(s)) return "Instagram";
  if (/facebook|fb\./.test(s)) return "Facebook";
  if (/whatsapp|wa\.me/.test(s)) return "WhatsApp";
  if (/bing|yahoo|duckduckgo/.test(s)) return "Outros buscadores";
  if (/youtube/.test(s)) return "YouTube";
  if (/mercadolivre|mercadopago/.test(s)) return "Mercado Livre";
  return "Outros sites";
}

const inc = (m: Map<string, number>, k: string, v = 1) => m.set(k, (m.get(k) ?? 0) + v);
const top = (m: Map<string, number>, n = 10) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, value]) => ({ name, value }));

export const getSalesDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ from: z.string(), to: z.string() }).parse(v))
  .handler(async ({ context, data }) => {
    const perms = await loadPermissions(context);
    if (!perms.isStaff || !perms.sections.includes("dashboard")) throw new Error("Forbidden");
    const money = perms.isAdmin || perms.sections.includes("pedidos");
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");

    const from = new Date(data.from);
    const to = new Date(data.to);
    const span = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - span);
    const now = Date.now();
    const cutoff24 = new Date(now - DAY).toISOString();

    const orderCols =
      "id, order_number, status, total, shipping_total, discount_total, payment_method, shipping_carrier, user_id, coupon_code, created_at, paid_at";

    const [orders, prevOrders, events, prevEvents, newProfiles] = await Promise.all([
      fetchAll<any>((a, b) => db.from("orders").select(orderCols).gte("created_at", from.toISOString()).lt("created_at", to.toISOString()).neq("status", "draft").range(a, b)),
      fetchAll<any>((a, b) => db.from("orders").select("id, status, total, paid_at").gte("created_at", prevFrom.toISOString()).lt("created_at", from.toISOString()).neq("status", "draft").range(a, b)),
      fetchAll<any>((a, b) => db.from("site_events").select("visitor_id, session_id, event_type, path, product_id, referrer_host, utm_source, device, created_at").gte("created_at", from.toISOString()).lt("created_at", to.toISOString()).range(a, b), 200_000),
      fetchAll<any>((a, b) => db.from("site_events").select("visitor_id, event_type").eq("event_type", "page_view").gte("created_at", prevFrom.toISOString()).lt("created_at", from.toISOString()).range(a, b), 200_000),
      fetchAll<any>((a, b) => db.from("profiles").select("id").gte("created_at", from.toISOString()).lt("created_at", to.toISOString()).range(a, b)),
    ]);

    const isPaid = (o: any) => !!o.paid_at && !PAID_EXCLUDED.has(o.status);
    const paid = orders.filter(isPaid);
    const prevPaid = prevOrders.filter(isPaid);
    const revenue = paid.reduce((s, o) => s + Number(o.total), 0);
    const prevRevenue = prevPaid.reduce((s, o) => s + Number(o.total), 0);

    // ---------- Visitas ----------
    const pv = events.filter((e) => e.event_type === "page_view");
    const visitors = new Set(pv.map((e) => e.visitor_id)).size;
    const sessions = new Set(pv.map((e) => e.session_id)).size;
    const prevVisitors = new Set(prevEvents.map((e) => e.visitor_id)).size;
    const visitsByDay = new Map<string, { views: number; visitors: Set<string> }>();
    const sources = new Map<string, number>();
    const devices = new Map<string, number>();
    const pages = new Map<string, number>();
    const seenSession = new Set<string>();
    for (const e of pv) {
      const k = dayKey(e.created_at);
      const d = visitsByDay.get(k) ?? { views: 0, visitors: new Set() };
      d.views++; d.visitors.add(e.visitor_id); visitsByDay.set(k, d);
      inc(pages, e.path ?? "/");
      if (!seenSession.has(e.session_id)) {
        seenSession.add(e.session_id);
        inc(sources, sourceOf(e.referrer_host, e.utm_source));
        inc(devices, e.device === "mobile" ? "Celular" : "Computador");
      }
    }

    // ---------- Funil ----------
    const sessWith = (t: string) => new Set(events.filter((e) => e.event_type === t).map((e) => e.session_id)).size;
    const funnel = [
      { step: "Visitas", value: sessions },
      { step: "Viu produto", value: sessWith("view_item") },
      { step: "Adicionou ao carrinho", value: sessWith("add_to_cart") },
      { step: "Iniciou checkout", value: sessWith("begin_checkout") },
      { step: "Pedido criado", value: orders.length },
      { step: "Pago", value: paid.length },
    ];

    // ---------- Produtos ----------
    const viewCount = new Map<string, number>();
    const cartAdds = new Map<string, number>();
    for (const e of events) {
      if (!e.product_id) continue;
      if (e.event_type === "view_item") inc(viewCount, e.product_id);
      if (e.event_type === "add_to_cart") inc(cartAdds, e.product_id);
    }
    const paidIds = paid.map((o) => o.id);
    const items = paidIds.length
      ? await fetchAll<any>((a, b) => db.from("order_items").select("order_id, product_id, product_name, quantity, subtotal").in("order_id", paidIds).range(a, b))
      : [];
    const soldQty = new Map<string, number>();
    const soldRev = new Map<string, number>();
    const names = new Map<string, string>();
    for (const i of items) {
      inc(soldQty, i.product_id, i.quantity);
      inc(soldRev, i.product_id, Number(i.subtotal));
      names.set(i.product_id, i.product_name);
    }
    const allProductIds = [...new Set([...viewCount.keys(), ...cartAdds.keys()])].filter((id) => !names.has(id));
    for (let i = 0; i < allProductIds.length; i += 200) {
      const { data: ps } = await db.from("products").select("id, name, slug").in("id", allProductIds.slice(i, i + 200));
      for (const p of ps ?? []) names.set(p.id, p.name);
    }
    const prodRow = (id: string) => ({
      id,
      name: names.get(id) ?? "Produto",
      views: viewCount.get(id) ?? 0,
      carts: cartAdds.get(id) ?? 0,
      sold: soldQty.get(id) ?? 0,
      revenue: money ? soldRev.get(id) ?? 0 : null,
    });
    const topViewed = [...viewCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => prodRow(id));
    const topSold = [...soldQty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => prodRow(id));
    const viewedNotSold = [...viewCount.entries()]
      .filter(([id, v]) => v >= 5 && !soldQty.has(id))
      .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => prodRow(id));
    const cartNotSold = [...cartAdds.entries()]
      .filter(([id]) => !soldQty.has(id))
      .sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => prodRow(id));

    // ---------- Vendas ----------
    const revenueByDay = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const k = dayKey(o.created_at);
      const d = revenueByDay.get(k) ?? { revenue: 0, orders: 0 };
      d.orders++;
      if (isPaid(o)) d.revenue += Number(o.total);
      revenueByDay.set(k, d);
    }
    const byStatus = new Map<string, number>();
    const byPayment = new Map<string, number>();
    const byCarrier = new Map<string, number>();
    let shippingTotal = 0;
    let discountTotal = 0;
    let couponUses = 0;
    for (const o of orders) inc(byStatus, o.status);
    for (const o of paid) {
      inc(byPayment, o.payment_method ?? "outro");
      if (o.shipping_carrier) inc(byCarrier, o.shipping_carrier);
      shippingTotal += Number(o.shipping_total ?? 0);
      discountTotal += Number(o.discount_total ?? 0);
      if (o.coupon_code) couponUses++;
    }

    // ---------- Clientes ----------
    const buyerIds = [...new Set(paid.map((o) => o.user_id))];
    const profiles = new Map<string, any>();
    const pendingOrders = (await db
      .from("orders")
      .select("id, order_number, total, user_id, created_at")
      .eq("status", "aguardando_pagamento")
      .lt("created_at", cutoff24)
      .gte("created_at", new Date(now - 60 * DAY).toISOString())
      .order("created_at", { ascending: false })
      .limit(30)).data ?? [];
    const carts = (await db
      .from("carts")
      .select("id, user_id, updated_at, cart_items(quantity, unit_price, product_id)")
      .eq("status", "active")
      .lt("updated_at", cutoff24)
      .gte("updated_at", new Date(now - 60 * DAY).toISOString())
      .order("updated_at", { ascending: false })
      .limit(200)).data ?? [];
    const abandoned = carts
      .map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        updated_at: c.updated_at,
        items: (c.cart_items ?? []).reduce((s: number, i: any) => s + i.quantity, 0),
        value: (c.cart_items ?? []).reduce((s: number, i: any) => s + i.quantity * Number(i.unit_price), 0),
      }))
      .filter((c) => c.items > 0);

    const needProfiles = [...new Set([...buyerIds, ...pendingOrders.map((o: any) => o.user_id), ...abandoned.map((c) => c.user_id)])];
    for (let i = 0; i < needProfiles.length; i += 200) {
      const { data: ps } = await db.from("profiles").select("id, full_name, customer_type, phone, whatsapp").in("id", needProfiles.slice(i, i + 200));
      for (const p of ps ?? []) profiles.set(p.id, p);
    }
    let repeat = 0;
    if (buyerIds.length) {
      const allPaid = await fetchAll<any>((a, b) => db.from("orders").select("user_id, status").in("user_id", buyerIds).not("paid_at", "is", null).range(a, b));
      const cnt = new Map<string, number>();
      for (const o of allPaid) if (!PAID_EXCLUDED.has(o.status)) inc(cnt, o.user_id);
      repeat = [...cnt.values()].filter((v) => v > 1).length;
    }
    const pfpj = { pf: { orders: 0, revenue: 0 }, pj: { orders: 0, revenue: 0 } };
    for (const o of paid) {
      const t = profiles.get(o.user_id)?.customer_type === "pj" ? "pj" : "pf";
      pfpj[t].orders++; pfpj[t].revenue += Number(o.total);
    }
    const byState = new Map<string, number>();
    if (paidIds.length) {
      const addrs = await fetchAll<any>((a, b) => db.from("order_addresses").select("order_id, state, kind").in("order_id", paidIds).in("kind", ["shipping", "both"]).range(a, b));
      const seen = new Set<string>();
      const totals = new Map(paid.map((o) => [o.id, Number(o.total)]));
      for (const a of addrs) {
        if (seen.has(a.order_id)) continue;
        seen.add(a.order_id);
        inc(byState, a.state ?? "—", money ? totals.get(a.order_id) ?? 0 : 1);
      }
    }
    const who = (uid: string) => {
      const p = profiles.get(uid);
      return { name: p?.full_name ?? null, phone: p?.whatsapp ?? p?.phone ?? null };
    };

    const days: string[] = [];
    for (let t = from.getTime(); t < to.getTime(); t += DAY) days.push(dayKey(new Date(t).toISOString()));
    const uniqDays = [...new Set(days)];

    const m = <T,>(v: T) => (money ? v : null);
    return {
      money,
      visits: {
        views: pv.length,
        visitors,
        sessions,
        prevVisitors,
        byDay: uniqDays.map((d) => ({ day: d, views: visitsByDay.get(d)?.views ?? 0, visitors: visitsByDay.get(d)?.visitors.size ?? 0 })),
        sources: top(sources),
        devices: top(devices),
        pages: top(pages, 15),
      },
      sales: {
        revenue: m(revenue),
        prevRevenue: m(prevRevenue),
        orders: orders.length,
        prevOrders: prevOrders.length,
        paidOrders: paid.length,
        prevPaidOrders: prevPaid.length,
        avgTicket: m(paid.length ? revenue / paid.length : 0),
        conversion: visitors ? paid.length / visitors : null,
        byDay: uniqDays.map((d) => ({ day: d, revenue: money ? revenueByDay.get(d)?.revenue ?? 0 : 0, orders: revenueByDay.get(d)?.orders ?? 0 })),
        byStatus: top(byStatus, 20),
        byPayment: top(byPayment),
        byCarrier: top(byCarrier),
        shippingTotal: m(shippingTotal),
        discountTotal: m(discountTotal),
        couponUses,
      },
      funnel,
      products: { topViewed, topSold, viewedNotSold, cartNotSold },
      customers: {
        newCustomers: newProfiles.length,
        buyers: buyerIds.length,
        repeat,
        pfpj: money ? pfpj : null,
        byState: top(byState, 27),
      },
      recovery: {
        abandonedCount: abandoned.length,
        abandonedValue: m(abandoned.reduce((s, c) => s + c.value, 0)),
        abandoned: money ? abandoned.slice(0, 30).map((c) => ({ ...c, ...who(c.user_id) })) : [],
        pendingCount: pendingOrders.length,
        pendingValue: m(pendingOrders.reduce((s: number, o: any) => s + Number(o.total), 0)),
        pending: money ? pendingOrders.map((o: any) => ({ id: o.id, order_number: o.order_number, total: Number(o.total), created_at: o.created_at, user_id: o.user_id, ...who(o.user_id) })) : [],
      },
    };
  });

export type SalesDashboard = Awaited<ReturnType<typeof getSalesDashboard>>;
