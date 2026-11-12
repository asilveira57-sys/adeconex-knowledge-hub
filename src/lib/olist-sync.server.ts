/**
 * Sincronização Olist (Tiny ERP, API v2) → site.
 *
 * Server-only. Chamar via `await import("@/lib/olist-sync.server")`.
 *
 * Para cada pedido já enviado à Olist (orders.metadata.olist.id), consulta
 * pedido.obter e aplica no site:
 * - nota fiscal emitida  → guarda número/link e envia "nota-fiscal-emitida"
 * - código de rastreio   → grava em shipments (provider "olist"), muda para
 *                          "enviado" e envia "pedido-enviado"
 * - situação "entregue"  → muda para "entregue" e envia "pedido-entregue"
 * - preparando/faturado  → "pago" vira "em_preparacao"
 *
 * Nunca regride o status do pedido e nunca cancela automaticamente.
 * Cada e-mail é enviado uma única vez (marcado em metadata.olist.notified).
 */

const TINY_API = "https://api.tiny.com.br/api2";
const TIMEOUT_MS = 15_000;

/** Ordem de avanço dos status do site (para não regredir). */
const RANK: Record<string, number> = {
  draft: 0,
  aguardando_pagamento: 1,
  pago: 2,
  em_preparacao: 3,
  aguardando_arte: 3,
  arte_aprovada: 3,
  em_producao: 3,
  enviado: 4,
  entregue: 5,
};

/** Status do site que ainda podem avançar via Olist. */
export const OLIST_SYNCABLE_STATUSES = [
  "pago",
  "em_preparacao",
  "aguardando_arte",
  "arte_aprovada",
  "em_producao",
  "enviado",
] as const;

type OlistMeta = {
  id?: string;
  numero?: string | null;
  situacao?: string | null;
  nota_fiscal?: {
    id: string;
    numero?: string | null;
    chave?: string | null;
    link?: string | null;
  } | null;
  rastreio?: string | null;
  url_rastreio?: string | null;
  synced_at?: string;
  notified?: { nota_fiscal?: string; enviado?: string; entregue?: boolean };
  /** false = pedido antigo: atualiza status/NF/rastreio sem e-mail ao cliente. */
  notify?: boolean;
};

export type OlistSyncResult = {
  orderId: string;
  ok: boolean;
  situacao?: string | null;
  changes: string[];
  error?: string;
};

function normalize(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

async function tinyGet(endpoint: string, params: Record<string, string>) {
  const token = process.env.OLIST_API_TOKEN;
  if (!token) throw new Error("Token da Olist não configurado.");
  const body = new URLSearchParams({ token, formato: "JSON", ...params });
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${TINY_API}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: ctl.signal,
    });
    const json: any = await res.json().catch(() => null);
    const ret = json?.retorno;
    if (!res.ok || !ret) throw new Error(`Olist HTTP ${res.status}`);
    if (ret.status !== "OK") {
      const erros = Array.isArray(ret.erros) ? ret.erros : ret.erros ? [ret.erros] : [];
      const msg = erros.map((e: any) => e?.erro ?? JSON.stringify(e)).join("; ");
      throw new Error(msg || `Olist: ${ret.status}`);
    }
    return ret;
  } finally {
    clearTimeout(to);
  }
}

export function trackingUrlFor(code: string, given?: string | null): string {
  if (given && /^https?:\/\//i.test(given)) return given;
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/i.test(code)) {
    return `https://rastreamento.correios.com.br/app/index.php?objeto=${encodeURIComponent(code.toUpperCase())}`;
  }
  return `https://www.melhorrastreio.com.br/rastreio/${encodeURIComponent(code)}`;
}

async function readMeta(supabaseAdmin: any, orderId: string) {
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, status, metadata, shipping_carrier, shipping_service")
    .eq("id", orderId)
    .maybeSingle();
  return order as {
    id: string;
    status: string;
    metadata: any;
    shipping_carrier: string | null;
    shipping_service: string | null;
  } | null;
}

async function writeOlistMeta(supabaseAdmin: any, orderId: string, patch: Partial<OlistMeta>) {
  const order = await readMeta(supabaseAdmin, orderId);
  const metadata = (
    order?.metadata && typeof order.metadata === "object" ? order.metadata : {}
  ) as Record<string, any>;
  const olist: OlistMeta = { ...(metadata.olist ?? {}), ...patch };
  await supabaseAdmin
    .from("orders")
    .update({ metadata: { ...metadata, olist } })
    .eq("id", orderId);
  return olist;
}

/** Chamado logo após incluir o pedido na Olist. */
export async function rememberOlistOrder(orderId: string, olistId: string, numero: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await writeOlistMeta(supabaseAdmin, orderId, { id: olistId, numero });
}

async function moveStatus(
  supabaseAdmin: any,
  orderId: string,
  from: string,
  to: string,
  comment: string,
) {
  if ((RANK[to] ?? -1) <= (RANK[from] ?? 99)) return false;
  const patch: Record<string, unknown> = { status: to };
  if (to === "enviado") patch.shipped_at = new Date().toISOString();
  if (to === "entregue") patch.delivered_at = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from("orders")
    .update(patch)
    .eq("id", orderId)
    .eq("status", from);
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("order_status_history").insert({
    order_id: orderId,
    from_status: from,
    to_status: to,
    comment,
  });
  return true;
}

export async function syncOrderWithOlist(orderId: string): Promise<OlistSyncResult> {
  const changes: string[] = [];
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendOrderEmail } = await import("@/lib/app-emails.server");
    const order = await readMeta(supabaseAdmin, orderId);
    if (!order) return { orderId, ok: false, changes, error: "Pedido não encontrado" };
    let meta: OlistMeta = order.metadata?.olist ?? {};
    if (!meta.id)
      return { orderId, ok: false, changes, error: "Pedido ainda não foi enviado à Olist" };

    const ret = await tinyGet("pedido.obter.php", { id: meta.id });
    const p = ret.pedido ?? {};
    const situacao: string = p.situacao ?? "";
    const sit = normalize(situacao);
    const notified = { ...(meta.notified ?? {}) };
    let status = order.status;

    // 1) Nota fiscal
    const nfId =
      p.id_nota_fiscal && String(p.id_nota_fiscal) !== "0" ? String(p.id_nota_fiscal) : null;
    let nota = meta.nota_fiscal ?? null;
    if (nfId && nota?.id !== nfId) {
      nota = { id: nfId };
      try {
        const nf = (await tinyGet("nota.fiscal.obter.php", { id: nfId })).nota_fiscal ?? {};
        nota.numero = nf.numero ? String(nf.numero) : null;
        nota.chave = nf.chave_acesso ? String(nf.chave_acesso) : null;
      } catch (e) {
        console.warn("[olist] nota.fiscal.obter", nfId, e);
      }
      try {
        const link = (await tinyGet("nota.fiscal.obter.link.php", { id: nfId })).link_nfe;
        nota.link = link ? String(link) : null;
      } catch (e) {
        console.warn("[olist] nota.fiscal.obter.link", nfId, e);
      }
      changes.push(`nota fiscal ${nota.numero ?? nfId}`);
    }

    // 2) Rastreio
    const code = String(p.codigo_rastreamento ?? "").trim() || null;
    const trackUrl = code ? trackingUrlFor(code, p.url_rastreamento) : null;
    if (code && code !== meta.rastreio) {
      const { data: existing } = await supabaseAdmin
        .from("shipments")
        .select("id")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const row = {
        order_id: orderId,
        provider: "olist",
        external_id: meta.id,
        carrier: p.transportador?.nome || p.forma_envio || order.shipping_carrier || null,
        service: p.forma_frete || order.shipping_service || null,
        tracking_code: code,
        tracking_url: trackUrl,
        status: "posted",
        posted_at: new Date().toISOString(),
        raw: { situacao, codigo_rastreamento: code, url_rastreamento: p.url_rastreamento ?? null },
      };
      if (existing?.id) await supabaseAdmin.from("shipments").update(row).eq("id", existing.id);
      else await supabaseAdmin.from("shipments").insert(row);
      changes.push(`rastreio ${code}`);
    }

    // 3) Status do pedido
    if (sit.includes("entregue") && !sit.includes("nao entregue")) {
      if (await moveStatus(supabaseAdmin, orderId, status, "entregue", `Olist: ${situacao}`)) {
        changes.push(`${status} → entregue`);
        status = "entregue";
      }
    } else if (code || sit === "enviado") {
      if (
        await moveStatus(
          supabaseAdmin,
          orderId,
          status,
          "enviado",
          `Olist: ${situacao}${code ? ` · rastreio ${code}` : ""}`,
        )
      ) {
        changes.push(`${status} → enviado`);
        status = "enviado";
      }
    } else if (
      status === "pago" &&
      (sit.includes("preparando") ||
        sit.includes("faturado") ||
        sit.includes("pronto para envio") ||
        nfId)
    ) {
      if (await moveStatus(supabaseAdmin, orderId, status, "em_preparacao", `Olist: ${situacao}`)) {
        changes.push("pago → em_preparacao");
        status = "em_preparacao";
      }
    }

    meta = await writeOlistMeta(supabaseAdmin, orderId, {
      situacao,
      nota_fiscal: nota,
      rastreio: code,
      url_rastreio: trackUrl,
      synced_at: new Date().toISOString(),
    });

    // 4) E-mails ao cliente (uma vez cada; nunca para pedidos marcados notify=false)
    const canNotify = meta.notify !== false;
    if (canNotify && nota?.id && notified.nota_fiscal !== nota.id) {
      await sendOrderEmail("nota-fiscal-emitida", orderId, {
        eventId: nota.id,
        vars: {
          nota_fiscal: nota.numero ?? "",
          link_nota: nota.link ?? "disponível na sua área do cliente",
        },
      });
      notified.nota_fiscal = nota.id;
    }
    if (canNotify && code && notified.enviado !== code && (RANK[status] ?? 0) >= RANK.enviado) {
      await sendOrderEmail("pedido-enviado", orderId, { eventId: code });
      notified.enviado = code;
    }
    if (canNotify && status === "entregue" && !notified.entregue) {
      await sendOrderEmail("pedido-entregue", orderId);
      notified.entregue = true;
    }
    if (JSON.stringify(notified) !== JSON.stringify(meta.notified ?? {})) {
      await writeOlistMeta(supabaseAdmin, orderId, { notified });
    }

    return { orderId, ok: true, situacao, changes };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error("[olist-sync]", orderId, error);
    return { orderId, ok: false, changes, error };
  }
}

/**
 * Rotina periódica: reconcilia pagamentos pendentes no Mercado Pago (rede de
 * segurança do webhook) e puxa NF/rastreio da Olist dos pedidos em andamento.
 */
export async function runOrderSync(opts: { limit?: number } = {}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 50);

  // Mercado Pago: pedidos aguardando pagamento criados nos últimos 5 dias
  const since = new Date(Date.now() - 5 * 86400_000).toISOString();
  const { data: pending } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("status", "aguardando_pagamento")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  const { syncOrderWithMercadoPago } = await import("@/lib/mp-sync.server");
  let mpChecked = 0;
  for (const o of pending ?? []) {
    try {
      await syncOrderWithMercadoPago(o.id);
      mpChecked++;
    } catch (e) {
      console.error("[order-sync] mp", o.id, e);
    }
  }

  // Olist: pedidos pagos e ainda não entregues, últimos 90 dias, menos recentemente sincronizados primeiro
  const olistSince = new Date(Date.now() - 90 * 86400_000).toISOString();
  const { data: active } = await supabaseAdmin
    .from("orders")
    .select("id, metadata")
    .in("status", [...OLIST_SYNCABLE_STATUSES])
    .gte("created_at", olistSince)
    .not("metadata->olist->>id", "is", null)
    .limit(200);
  const queue = (active ?? [])
    .sort((a: any, b: any) =>
      String(a.metadata?.olist?.synced_at ?? "").localeCompare(
        String(b.metadata?.olist?.synced_at ?? ""),
      ),
    )
    .slice(0, limit);
  const olist: OlistSyncResult[] = [];
  for (const o of queue) olist.push(await syncOrderWithOlist(o.id));

  return {
    mercadopago_checked: mpChecked,
    olist_checked: olist.length,
    olist_changes: olist
      .filter((r) => r.changes.length)
      .map((r) => ({ id: r.orderId, changes: r.changes })),
    olist_errors: olist.filter((r) => !r.ok).map((r) => ({ id: r.orderId, error: r.error })),
  };
}

/** Localiza o pedido do site a partir do id da Olist. */
export async function findOrderByOlistId(olistId: string): Promise<string | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("metadata->olist->>id", olistId)
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}
