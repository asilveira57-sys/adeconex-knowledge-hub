/**
 * Redirecionamentos cadastrados no admin (public.legacy_redirects).
 *
 * - Carrega todos os redirects ativos em memória (cache de 5 min por isolate).
 * - Para redirects de produto com entity_id, o destino é sempre o slug ATUAL
 *   do produto (sobrevive a trocas de slug e evita cadeias de 301).
 * - Destinos legados "/catalogo/<slug>" (rota inexistente) viram "/produto/<slug>".
 * - Incrementa hits/last_hit_at sem bloquear a resposta.
 */

type Row = {
  id: string;
  old_url: string;
  new_url: string;
  entity_type: string | null;
  entity_id: string | null;
  http_status: number | null;
};

const TTL_MS = 5 * 60_000;
let cache: { at: number; map: Map<string, Row> } | null = null;
let loading: Promise<Map<string, Row>> | null = null;

export function normalizePath(path: string): string {
  let p = path.split("#")[0].split("?")[0];
  try {
    p = decodeURI(p);
  } catch {
    // mantém como veio
  }
  if (p.length > 1 && p.endsWith("/")) p = p.replace(/\/+$/, "");
  return p.toLowerCase() || "/";
}

async function loadMap(): Promise<Map<string, Row>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.map;
  if (loading) return loading;
  loading = (async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const map = new Map<string, Row>();
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabaseAdmin
        .from("legacy_redirects")
        .select("id, old_url, new_url, entity_type, entity_id, http_status")
        .eq("is_active", true)
        .range(from, from + pageSize - 1);
      if (error) throw new Error(error.message);
      for (const r of (data ?? []) as Row[]) {
        if (r.old_url) map.set(normalizePath(r.old_url), r);
      }
      if (!data || data.length < pageSize) break;
    }
    cache = { at: Date.now(), map };
    return map;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

function bumpHit(id: string) {
  void (async () => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).rpc("bump_legacy_redirect_hit", { _id: id });
    } catch {
      // contagem é best-effort
    }
  })();
}

export type RedirectMatch = { to: string; status: 301 | 302 | 307 | 308 };

export async function findDbRedirect(pathname: string): Promise<RedirectMatch | null> {
  let map: Map<string, Row>;
  try {
    map = await loadMap();
  } catch {
    return null;
  }
  const row = map.get(normalizePath(pathname));
  if (!row) return null;

  let to = row.new_url?.trim() || "";
  if (row.entity_type === "product" && row.entity_id) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("products")
      .select("slug, status")
      .eq("id", row.entity_id)
      .maybeSingle();
    if (data?.slug && (data.status === "published" || data.status === "enriched")) {
      to = `/produto/${data.slug}`;
    }
  }
  to = to.replace(/^\/catalogo\/(?!lista\/)([^/?#]+)/, "/produto/$1");
  if (!to || normalizePath(to) === normalizePath(pathname)) return null;

  bumpHit(row.id);
  const s = row.http_status;
  const status = s === 302 || s === 307 || s === 308 ? s : 301;
  return { to, status };
}
