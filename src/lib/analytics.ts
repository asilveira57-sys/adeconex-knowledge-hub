/**
 * Google Analytics (gtag.js) — carregamento sob demanda e envio de eventos.
 * Se a medição não estiver configurada, as funções viram no-op.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env
  .VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined;

let initialized = false;

export function initAnalytics() {
  if (typeof window === "undefined" || initialized || !MEASUREMENT_ID) return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.gtag?.("event", name, params);
}

export type MarketplaceName = "mercado_livre" | "shopee";

/** Clique nos botões "Comprar no Mercado Livre" / "Comprar na Shopee". */
export function trackMarketplaceClick(input: {
  marketplace: MarketplaceName;
  productId?: string | number | null;
  productName?: string | null;
  sku?: string | null;
  price?: number | null;
  url: string;
}) {
  const params = {
    marketplace: input.marketplace,
    item_id: input.sku ?? input.productId ?? undefined,
    item_name: input.productName ?? undefined,
    value: input.price ?? undefined,
    currency: "BRL",
    link_url: input.url,
    outbound: true,
  };
  trackEvent("marketplace_click", params);
  // Evento padrão GA4 de saída, útil para relatórios prontos.
  trackEvent("select_promotion", {
    promotion_name: `marketplace_${input.marketplace}`,
    ...params,
  });
}
