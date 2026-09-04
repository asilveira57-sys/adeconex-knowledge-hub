/**
 * Central de SEO & Tracking — tipos e constantes compartilhadas (client-safe).
 */

export const SETTING_KEYS = [
  "seo_general",
  "integration_ga4",
  "integration_gtm",
  "integration_google_ads",
  "integration_meta_pixel",
  "integration_search_console",
  "robots_txt",
  "launch_notice",
  "whatsapp_button",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

export const SETTING_LABELS: Record<SettingKey, string> = {
  seo_general: "Configurações gerais de SEO",
  integration_ga4: "Google Analytics 4",
  integration_gtm: "Google Tag Manager",
  integration_google_ads: "Google Ads",
  integration_meta_pixel: "Meta Pixel",
  integration_search_console: "Google Search Console",
  robots_txt: "Robots.txt",
  launch_notice: "Pop-up de aviso de lançamento",
  whatsapp_button: "Botão flutuante de WhatsApp",
};

/** Pop-up exibido na abertura do site (aviso de fase de implementação). */
export interface LaunchNoticeConfig {
  enabled: boolean;
  title: string;
  message: string;
}

/* ───────── Botão flutuante de WhatsApp ───────── */

export type WhatsappScope =
  | "all"
  | "home"
  | "product"
  | "category"
  | "cart"
  | "blog"
  | "institutional"
  | "selected";

export const WHATSAPP_SCOPE_LABELS: Record<WhatsappScope, string> = {
  all: "Site inteiro",
  home: "Página inicial",
  product: "Páginas de produtos",
  category: "Catálogo e categorias",
  cart: "Carrinho e checkout",
  blog: "Blog",
  institutional: "Páginas institucionais",
  selected: "Páginas selecionadas",
};

export interface WhatsappButtonConfig {
  enabled: boolean;
  phone: string;
  message: string;
  initial_position: "bottom-right" | "bottom-left";
  draggable: boolean;
  closable: boolean;
  scopes: WhatsappScope[];
  /** Caminhos exatos (um por linha) quando "selected" estiver ativo. */
  selected_paths: string;
}

export const WHATSAPP_BUTTON_DEFAULTS: WhatsappButtonConfig = {
  enabled: true,
  phone: "5527992733033",
  message: "Olá! Vim pelo site da Adeconex e gostaria de atendimento.",
  initial_position: "bottom-right",
  draggable: true,
  closable: true,
  scopes: ["all"],
  selected_paths: "",
};

function normalizePathname(p: string): string {
  const clean = (p || "/").split("?")[0]!.split("#")[0]!;
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
}

/** Decide se o botão deve aparecer no caminho atual conforme as regras do admin. */
export function whatsappVisibleOnPath(path: string, cfg: WhatsappButtonConfig): boolean {
  const p = normalizePathname(path);
  if (p.startsWith("/admin") || p.startsWith("/_authenticated/admin")) return false;
  const scopes = cfg.scopes?.length ? cfg.scopes : ["all"];
  if (scopes.includes("all")) return true;
  const institutional = ["/empresa", "/contato", "/marketplaces", "/downloads", "/avaliacoes", "/conhecimento", "/ferramentas", "/b2b"];
  return scopes.some((s) => {
    switch (s) {
      case "home":
        return p === "/";
      case "product":
        return p.startsWith("/produto");
      case "category":
        return p.startsWith("/catalogo");
      case "cart":
        return p.startsWith("/carrinho") || p.startsWith("/checkout");
      case "blog":
        return p.startsWith("/blog");
      case "institutional":
        return institutional.some((i) => p === i || p.startsWith(`${i}/`));
      case "selected":
        return (cfg.selected_paths || "")
          .split(/[\n,]/)
          .map((x) => normalizePathname(x.trim()))
          .filter((x) => x !== "/" || x === "/")
          .some((x) => x === p);
      default:
        return false;
    }
  });
}

/** Monta a URL wa.me com a mensagem inicial codificada. */
export function buildWhatsappUrl(phone: string, message: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message || "")}`;
}


export type TrackingEnvironment = "production" | "staging" | "both";

export const ENVIRONMENT_LABELS: Record<TrackingEnvironment, string> = {
  production: "Produção",
  staging: "Homologação",
  both: "Ambos",
};

export interface Ga4Config {
  enabled: boolean;
  measurement_id: string;
  install_method: "gtag" | "gtm";
  environment: TrackingEnvironment;
}

export interface GtmConfig {
  enabled: boolean;
  container_id: string;
  ga4_via_gtm: boolean;
  environment: TrackingEnvironment;
}

export interface GoogleAdsConversion {
  name: string;
  conversion_id: string;
  conversion_label: string;
}

export interface GoogleAdsConfig {
  enabled: boolean;
  ads_id: string;
  conversions: GoogleAdsConversion[];
  environment: TrackingEnvironment;
}

export interface MetaPixelConfig {
  enabled: boolean;
  pixel_id: string;
  environment: TrackingEnvironment;
}

export interface SearchConsoleConfig {
  verification_meta: string;
  property_domain: string;
  property_url_prefix: string;
}

export interface SeoGeneralConfig {
  site_name: string;
  company_name: string;
  site_url: string;
  canonical_domain: string;
  default_meta_title: string;
  default_meta_description: string;
  default_meta_keywords: string;
  default_og_image: string;
  language: string;
  country: string;
  phone: string;
  whatsapp: string;
  email: string;
  social_instagram: string;
  social_youtube: string;
  social_linkedin: string;
  title_template_product: string;
  title_template_category: string;
  title_template_post: string;
  [k: string]: string;
}

/** Configuração pública (somente campos não sensíveis) usada pelo runtime do site. */
export interface PublicTrackingConfig {
  ga4: { enabled: boolean; measurement_id: string; install_method: "gtag" | "gtm"; environment: TrackingEnvironment };
  gtm: { enabled: boolean; container_id: string; ga4_via_gtm: boolean; environment: TrackingEnvironment };
  google_ads: {
    enabled: boolean;
    ads_id: string;
    environment: TrackingEnvironment;
    /** IDs/labels de conversão não são segredo — já trafegam na gtag pública. */
    conversions: Array<{ name: string; conversion_id: string; conversion_label: string }>;
  };
  meta_pixel: { enabled: boolean; pixel_id: string; environment: TrackingEnvironment };
  search_console_verification: string;
  canonical_domain: string;
}

export type IntegrationStatus = "connected" | "not_configured" | "attention";

export interface DashboardIntegration {
  key: string;
  label: string;
  status: IntegrationStatus;
  detail: string;
}

export interface SeoCentralDashboard {
  integrations: DashboardIntegration[];
  metrics: {
    indexable_pages: number;
    published_products: number;
    products_without_title: number;
    products_without_description: number;
    published_categories: number;
    categories_without_title: number;
    images_without_alt: number;
    active_redirects: number;
    total_redirects: number;
    seo_pages_registered: number;
    seo_pages_noindex: number;
  };
}
