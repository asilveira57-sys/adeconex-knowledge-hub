/**
 * Tracking runtime — GA4 (gtag), Google Tag Manager, Google Ads e Meta Pixel.
 * A configuração vem da Central de SEO (site_settings) via getPublicTrackingConfig,
 * com fallback para o Measurement ID do ambiente (conector Google Analytics).
 * Se a configuração não puder ser lida, cai no comportamento anterior (GA4 via env).
 *
 * Eventos de e-commerce (view_item, add_to_cart, begin_checkout, purchase) são
 * despachados apenas para as plataformas ativas no ambiente atual:
 * - GA4: via gtag('event', ...) quando instalado diretamente.
 * - GTM: via dataLayer.push({ event, ecommerce }) — tags do container consomem.
 * - Meta Pixel: via fbq('track', ViewContent/AddToCart/InitiateCheckout/Purchase).
 * - Google Ads: conversão de compra via gtag('event', 'conversion', ...).
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
let configPromise: Promise<PublicTrackingConfig | null> | null = null;

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

type Fbq = ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean; version?: string };

function installMetaPixel(pixelId: string) {
  if (window.fbq) return;
  const fbq: Fbq = (...args: unknown[]) => {
    if (fbq.queue) fbq.queue.push(args);
    else fbq.queue = [args];
  };
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  window.fbq = fbq;
  window._fbq = fbq;
  loadScript("https://connect.facebook.net/en_US/fbevents.js");
  fbq("init", pixelId);
  fbq("track", "PageView");
}

/** Quais plataformas estão ativas neste ambiente — decide o dispatch dos eventos. */
interface ActivePlatforms {
  /** GA4 medição via gtag direto OU via GTM (eventos entram pela dataLayer). */
  ga4Direct: boolean;
  gtm: boolean;
  googleAds: boolean;
  metaPixel: boolean;
  adsConversions: Array<{ name: string; conversion_id: string; conversion_label: string }>;
}

function resolvePlatforms(config: PublicTrackingConfig): ActivePlatforms {
  const domain = config.canonical_domain || "https://www.adeconex.com.br";
  const gtmActive =
    config.gtm.enabled &&
    !!config.gtm.container_id &&
    environmentMatches(config.gtm.environment, domain);
  const ga4Id = config.ga4.measurement_id || FALLBACK_GA4_ID || "";
  const ga4ViaGtm = gtmActive && (config.gtm.ga4_via_gtm || config.ga4.install_method === "gtm");
  const ga4Direct =
    config.ga4.enabled && !!ga4Id && !ga4ViaGtm && environmentMatches(config.ga4.environment, domain);
  const googleAds =
    config.google_ads.enabled &&
    !!config.google_ads.ads_id &&
    environmentMatches(config.google_ads.environment, domain);
  const metaPixel =
    config.meta_pixel.enabled &&
    !!config.meta_pixel.pixel_id &&
    environmentMatches(config.meta_pixel.environment, domain);
  return { ga4Direct, gtm: gtmActive, googleAds, metaPixel, adsConversions: config.google_ads.conversions };
}

function applyConfig(config: PublicTrackingConfig) {
  const p = resolvePlatforms(config);

  if (p.gtm) installGtm(config.gtm.container_id);

  // GA4 direto via gtag apenas quando NÃO controlado pelo GTM (evita duplicação).
  const ga4Id = config.ga4.measurement_id || FALLBACK_GA4_ID || "";
  if (p.ga4Direct) {
    installGtag(ga4Id, p.googleAds ? config.google_ads.ads_id : undefined);
  } else if (p.googleAds && !p.gtm && !config.ga4.enabled) {
    // Google Ads sozinho (sem GA4 e sem GTM) ainda precisa da gtag base.
    installGtag(config.google_ads.ads_id);
  }

  if (p.metaPixel) installMetaPixel(config.meta_pixel.pixel_id);
}

function loadConfig(): Promise<PublicTrackingConfig | null> {
  if (!configPromise) {
    configPromise = getPublicTrackingConfig()
      .then((config) => config)
      .catch(() => null);
  }
  return configPromise;
}

export function initAnalytics() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  loadConfig()
    .then((config) => {
      if (config) {
        applyConfig(config);
      } else if (FALLBACK_GA4_ID) {
        // Fallback: comportamento anterior (GA4 via env do conector).
        installGtag(FALLBACK_GA4_ID);
      }
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

// ─── E-commerce dataLayer ────────────────────────────────────────────────────

export interface EcomItem {
  /** SKU ou id do produto/variação. */
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  /** Preço unitário em BRL. */
  price: number;
  quantity: number;
}

const CURRENCY = "BRL";

/** Executa o dispatch quando a config estiver carregada, com as plataformas ativas. */
function dispatchEcommerce(dispatch: (p: ActivePlatforms) => void) {
  if (typeof window === "undefined") return;
  loadConfig().then((config) => {
    if (!config) return;
    dispatch(resolvePlatforms(config));
  });
}

/** Push no padrão GTM: limpa a chave ecommerce anterior e empurra o novo evento. */
function pushGtmEvent(event: string, ecommerce: Record<string, unknown>) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ecommerce });
}

function toGa4Items(items: EcomItem[]) {
  return items.map((i) => ({
    item_id: i.item_id,
    item_name: i.item_name,
    item_variant: i.item_variant || undefined,
    item_category: i.item_category || undefined,
    price: i.price,
    quantity: i.quantity,
  }));
}

function metaContentIds(items: EcomItem[]) {
  return items.map((i) => i.item_id);
}

/** Item exibido em uma listagem (catálogo, vitrine, resultado de busca). */
export interface EcomListItem extends EcomItem {
  /** Posição na lista, começando em 1. */
  index?: number;
}

function toGa4ListItems(items: EcomListItem[], listId: string, listName: string) {
  return items.map((i, n) => ({
    ...toGa4Items([i])[0],
    index: i.index ?? n + 1,
    item_list_id: listId,
    item_list_name: listName,
  }));
}

/** Visualização de uma lista de produtos (catálogo, busca, vitrine). */
export function trackViewItemList(input: {
  listId: string;
  listName: string;
  items: EcomListItem[];
  /** Termo/filtros aplicados — dispara também o evento `search` quando presente. */
  searchTerm?: string | null;
}) {
  if (input.items.length === 0) return;
  const items = toGa4ListItems(input.items, input.listId, input.listName);
  dispatchEcommerce((p) => {
    const payload = { item_list_id: input.listId, item_list_name: input.listName, items };
    if (p.ga4Direct) {
      window.gtag?.("event", "view_item_list", payload);
      if (input.searchTerm) window.gtag?.("event", "search", { search_term: input.searchTerm });
    }
    if (p.gtm) {
      pushGtmEvent("view_item_list", payload);
      if (input.searchTerm) {
        window.dataLayer!.push({ event: "search", search_term: input.searchTerm });
      }
    }
    if (p.metaPixel) {
      window.fbq?.("track", input.searchTerm ? "Search" : "ViewContent", {
        content_ids: metaContentIds(input.items),
        content_type: "product",
        content_category: input.listName,
        search_string: input.searchTerm || undefined,
        currency: CURRENCY,
      });
    }
  });
}

/** Clique em um produto dentro de uma lista. */
export function trackSelectItem(input: {
  listId: string;
  listName: string;
  item: EcomListItem;
}) {
  const items = toGa4ListItems([input.item], input.listId, input.listName);
  dispatchEcommerce((p) => {
    const payload = { item_list_id: input.listId, item_list_name: input.listName, items };
    if (p.ga4Direct) window.gtag?.("event", "select_item", payload);
    if (p.gtm) pushGtmEvent("select_item", payload);
  });
}

/** Visualização de produto (PDP). */

export function trackViewItem(item: EcomItem) {
  const value = item.price * item.quantity;
  dispatchEcommerce((p) => {
    if (p.ga4Direct) {
      window.gtag?.("event", "view_item", { currency: CURRENCY, value, items: toGa4Items([item]) });
    }
    if (p.gtm) pushGtmEvent("view_item", { currency: CURRENCY, value, items: toGa4Items([item]) });
    if (p.metaPixel) {
      window.fbq?.("track", "ViewContent", {
        content_ids: [item.item_id],
        content_name: item.item_name,
        content_type: "product",
        value,
        currency: CURRENCY,
      });
    }
  });
}

/** Adição ao carrinho. */
export function trackAddToCart(item: EcomItem) {
  const value = item.price * item.quantity;
  dispatchEcommerce((p) => {
    if (p.ga4Direct) {
      window.gtag?.("event", "add_to_cart", { currency: CURRENCY, value, items: toGa4Items([item]) });
    }
    if (p.gtm) pushGtmEvent("add_to_cart", { currency: CURRENCY, value, items: toGa4Items([item]) });
    if (p.metaPixel) {
      window.fbq?.("track", "AddToCart", {
        content_ids: [item.item_id],
        content_name: item.item_name,
        content_type: "product",
        value,
        currency: CURRENCY,
      });
    }
  });
}

/** Início do checkout. */
export function trackBeginCheckout(items: EcomItem[], value: number, coupon?: string | null) {
  dispatchEcommerce((p) => {
    const payload = { currency: CURRENCY, value, coupon: coupon || undefined, items: toGa4Items(items) };
    if (p.ga4Direct) window.gtag?.("event", "begin_checkout", payload);
    if (p.gtm) pushGtmEvent("begin_checkout", payload);
    if (p.metaPixel) {
      window.fbq?.("track", "InitiateCheckout", {
        content_ids: metaContentIds(items),
        content_type: "product",
        num_items: items.reduce((s, i) => s + i.quantity, 0),
        value,
        currency: CURRENCY,
      });
    }
  });
}

export interface PurchaseInput {
  /** ID único do pedido (deduplicação no GA4/Ads). */
  transaction_id: string;
  value: number;
  shipping?: number;
  coupon?: string | null;
  payment_method?: string | null;
  items: EcomItem[];
}

/** Compra concluída — GA4 + GTM + Meta Pixel + conversão do Google Ads. */
export function trackPurchase(input: PurchaseInput) {
  dispatchEcommerce((p) => {
    const payload = {
      transaction_id: input.transaction_id,
      currency: CURRENCY,
      value: input.value,
      shipping: input.shipping ?? undefined,
      coupon: input.coupon || undefined,
      payment_type: input.payment_method || undefined,
      items: toGa4Items(input.items),
    };
    if (p.ga4Direct) window.gtag?.("event", "purchase", payload);
    if (p.gtm) pushGtmEvent("purchase", payload);
    if (p.metaPixel) {
      window.fbq?.("track", "Purchase", {
        content_ids: metaContentIds(input.items),
        content_type: "product",
        num_items: input.items.reduce((s, i) => s + i.quantity, 0),
        value: input.value,
        currency: CURRENCY,
      });
    }
    if (p.googleAds && p.adsConversions.length > 0 && typeof window.gtag === "function") {
      // Prefere a conversão cujo nome indica compra; senão usa a primeira.
      const conv =
        p.adsConversions.find((c) => /compra|purchase/i.test(c.name)) ?? p.adsConversions[0];
      window.gtag("event", "conversion", {
        send_to: `${conv.conversion_id}/${conv.conversion_label}`,
        value: input.value,
        currency: CURRENCY,
        transaction_id: input.transaction_id,
      });
    }
  });
}
