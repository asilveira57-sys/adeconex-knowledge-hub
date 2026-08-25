/**
 * Tracking runtime — GA4 (gtag), Google Tag Manager e Meta Pixel.
 * A configuração vem da Central de SEO (site_settings) via getPublicTrackingConfig,
 * com fallback para o Measurement ID do ambiente (conector Google Analytics).
 * Se a configuração não puder ser lida, cai no comportamento anterior (GA4 via env).
 */

import { getPublicTrackingConfig } from "@/lib/seo-central.functions";
import type { PublicTrackingConfig, TrackingEnvironment } from "@/lib/seo-central.shared";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const FALLBACK_GA4_ID = import.meta.env
  .VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY as string | undefined;

let initialized = false;

function environmentMatches(env: TrackingEnvironment, canonicalDomain: string): boolean {
  if (env === "both") return true;
  let canonicalHost = "";
  try {
    canonicalHost = new URL(canonicalDomain).hostname;
  } catch {
    canonicalHost = "";
  }
  const isProduction = canonicalHost !== "" && window.location.hostname === canonicalHost;
  return env === "production" ? isProduction : !isProduction;
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

function loadScript(src: string) {
  const script = document.createElement("script");
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function installGtm(containerId: string) {
  ensureDataLayer();
  window.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
  loadScript(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`);
}

function installGtag(measurementId: string, adsId?: string) {
  ensureDataLayer();
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
  window.gtag!("js", new Date());
  window.gtag!("config", measurementId);
  if (adsId) window.gtag!("config", adsId);
}

function installMetaPixel(pixelId: string) {
  if (window.fbq) return;
  const fbq = function (...args: unknown[]) {
    // @ts-expect-error fila interna do pixel
    fbq.queue ? fbq.queue.push(args) : (fbq.queue = [args]);
  } as unknown as { (...args: unknown[]): void; queue: unknown[]; loaded?: boolean; version?: string };
  window.fbq = fbq as never;
  window._fbq = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  loadScript("https://connect.facebook.net/en_US/fbevents.js");
  window.fbq!("init", pixelId);
  window.fbq!("track", "PageView");
}

function applyConfig(config: PublicTrackingConfig) {
  const domain = config.canonical_domain || "https://www.adeconex.com.br";

  const gtmActive =
    config.gtm.enabled &&
    !!config.gtm.container_id &&
    environmentMatches(config.gtm.environment, domain);
  if (gtmActive) installGtm(config.gtm.container_id);

  // GA4 direto via gtag apenas quando NÃO controlado pelo GTM (evita duplicação).
  const ga4Id = config.ga4.measurement_id || FALLBACK_GA4_ID || "";
  const ga4ViaGtm = gtmActive && (config.gtm.ga4_via_gtm || config.ga4.install_method === "gtm");
  if (
    config.ga4.enabled &&
    ga4Id &&
    !ga4ViaGtm &&
    environmentMatches(config.ga4.environment, domain)
  ) {
    const adsActive =
      config.google_ads.enabled &&
      !!config.google_ads.ads_id &&
      environmentMatches(config.google_ads.environment, domain);
    installGtag(ga4Id, adsActive ? config.google_ads.ads_id : undefined);
  } else if (
    config.google_ads.enabled &&
    config.google_ads.ads_id &&
    !gtmActive &&
    !config.ga4.enabled &&
    environmentMatches(config.google_ads.environment, domain)
  ) {
    // Google Ads sozinho (sem GA4 e sem GTM) ainda precisa da gtag base.
    installGtag(config.google_ads.ads_id);
  }

  if (
    config.meta_pixel.enabled &&
    config.meta_pixel.pixel_id &&
    environmentMatches(config.meta_pixel.environment, domain)
  ) {
    installMetaPixel(config.meta_pixel.pixel_id);
  }
}

export function initAnalytics() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  getPublicTrackingConfig()
    .then((config) => applyConfig(config))
    .catch(() => {
      // Fallback: comportamento anterior (GA4 via env do conector).
      if (!FALLBACK_GA4_ID) return;
      installGtag(FALLBACK_GA4_ID);
    });
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
