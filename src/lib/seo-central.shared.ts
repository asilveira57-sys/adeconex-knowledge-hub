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
};

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
