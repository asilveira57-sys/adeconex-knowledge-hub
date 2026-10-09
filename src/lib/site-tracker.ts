/**
 * Registro próprio de visitas (painel interno). Anônimo: visitor_id aleatório
 * no localStorage e session_id no sessionStorage (expira em 30 min ocioso).
 */
type EventType = "page_view" | "view_item" | "add_to_cart" | "begin_checkout";

function rid() {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(/-/g, "").slice(0, 24);
}

function ids() {
  let v = localStorage.getItem("adx_vid");
  if (!v) { v = rid(); localStorage.setItem("adx_vid", v); }
  const now = Date.now();
  let s = sessionStorage.getItem("adx_sid");
  const last = Number(sessionStorage.getItem("adx_sts") ?? 0);
  if (!s || now - last > 30 * 60_000) { s = rid(); sessionStorage.setItem("adx_sid", s); }
  sessionStorage.setItem("adx_sts", String(now));
  return { v, s };
}

function firstTouch() {
  const ref = document.referrer ? (() => { try { return new URL(document.referrer).hostname; } catch { return ""; } })() : "";
  const utm = new URLSearchParams(location.search).get("utm_source") ?? "";
  return { ref: ref === location.hostname ? "" : ref, utm };
}

export function siteTrack(type: EventType, productId?: string) {
  if (typeof window === "undefined") return;
  try {
    const path = location.pathname;
    if (path.startsWith("/admin") || path.startsWith("/lovable")) return;
    if (/bot|crawl|spider|headless|lighthouse/i.test(navigator.userAgent)) return;
    const { v, s } = ids();
    const t = firstTouch();
    const body = JSON.stringify({
      visitor_id: v,
      session_id: s,
      event_type: type,
      path: path.slice(0, 300),
      product_id: productId,
      referrer_host: type === "page_view" ? t.ref : "",
      utm_source: t.utm,
      device: /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : "desktop",
    });
    const url = "/api/public/track";
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    else fetch(url, { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  } catch {
    /* nunca quebrar a página */
  }
}
