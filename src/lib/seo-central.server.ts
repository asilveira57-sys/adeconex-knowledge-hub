/**
 * Central de SEO & Tracking — helpers server-only.
 * Importado apenas dentro de handlers de server functions / server routes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type {
  DashboardIntegration,
  Ga4Config,
  GoogleAdsConfig,
  GtmConfig,
  MetaPixelConfig,
  PublicTrackingConfig,
  SearchConsoleConfig,
  SeoCentralDashboard,
  SettingKey,
} from "@/lib/seo-central.shared";

type AdminClient = SupabaseClient<Database>;

const INTEGRATION_KEYS: SettingKey[] = [
  "integration_ga4",
  "integration_gtm",
  "integration_google_ads",
  "integration_meta_pixel",
  "integration_search_console",
];

export async function fetchSettingsMap(admin: AdminClient): Promise<Record<string, any>> {
  const { data, error } = await admin.from("site_settings").select("key, value");
  if (error) throw new Error(error.message);
  const map: Record<string, any> = {};
  for (const row of data ?? []) map[row.key] = row.value;
  return map;
}

function ga4Status(c: Ga4Config | undefined): DashboardIntegration {
  if (!c?.enabled) return { key: "ga4", label: "Google Analytics 4", status: "not_configured", detail: "Desativado" };
  if (!c.measurement_id) return { key: "ga4", label: "Google Analytics 4", status: "attention", detail: "Ativo sem Measurement ID no banco — usando ID do ambiente, se existir" };
  return { key: "ga4", label: "Google Analytics 4", status: "connected", detail: `${c.measurement_id} · via ${c.install_method === "gtm" ? "GTM" : "gtag"}` };
}

export async function buildDashboard(admin: AdminClient): Promise<SeoCentralDashboard> {
  const settings = await fetchSettingsMap(admin);

  const ga4 = settings.integration_ga4 as Ga4Config | undefined;
  const gtm = settings.integration_gtm as GtmConfig | undefined;
  const ads = settings.integration_google_ads as GoogleAdsConfig | undefined;
  const meta = settings.integration_meta_pixel as MetaPixelConfig | undefined;
  const gsc = settings.integration_search_console as SearchConsoleConfig | undefined;

  const integrations: DashboardIntegration[] = [
    ga4Status(ga4),
    !gtm?.enabled
      ? { key: "gtm", label: "Google Tag Manager", status: "not_configured", detail: "Desativado" }
      : !gtm.container_id
        ? { key: "gtm", label: "Google Tag Manager", status: "attention", detail: "Ativo sem Container ID" }
        : { key: "gtm", label: "Google Tag Manager", status: "connected", detail: gtm.container_id },
    !ads?.enabled
      ? { key: "google_ads", label: "Google Ads", status: "not_configured", detail: "Desativado" }
      : !ads.ads_id
        ? { key: "google_ads", label: "Google Ads", status: "attention", detail: "Ativo sem Ads ID" }
        : { key: "google_ads", label: "Google Ads", status: "connected", detail: `${ads.ads_id} · ${(ads.conversions ?? []).length} conversão(ões)` },
    !meta?.enabled
      ? { key: "meta_pixel", label: "Meta Pixel", status: "not_configured", detail: "Desativado" }
      : !meta.pixel_id
        ? { key: "meta_pixel", label: "Meta Pixel", status: "attention", detail: "Ativo sem Pixel ID" }
        : { key: "meta_pixel", label: "Meta Pixel", status: "connected", detail: meta.pixel_id },
    gsc?.verification_meta
      ? { key: "search_console", label: "Search Console", status: "connected", detail: "Meta tag de verificação configurada" }
      : { key: "search_console", label: "Search Console", status: "not_configured", detail: "Sem meta tag de verificação" },
    { key: "sitemap", label: "Sitemap.xml", status: "connected", detail: "Gerado dinamicamente em /sitemap.xml" },
    { key: "robots", label: "Robots.txt", status: "connected", detail: "Gerenciado pela Central em /robots.txt" },
  ];

  const count = async (q: PromiseLike<{ count: number | null; error: any }>) => {
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return count ?? 0;
  };

  const [
    publishedProducts,
    productsNoTitle,
    productsNoDesc,
    publishedCategories,
    categoriesNoTitle,
    imagesNoAlt,
    activeRedirects,
    totalRedirects,
    seoPages,
    seoPagesNoindex,
  ] = await Promise.all([
    count(admin.from("products").select("id", { count: "exact", head: true }).eq("status", "published")),
    count(admin.from("products").select("id", { count: "exact", head: true }).eq("status", "published").or("seo_title.is.null,seo_title.eq.")),
    count(admin.from("products").select("id", { count: "exact", head: true }).eq("status", "published").or("seo_description.is.null,seo_description.eq.")),
    count(admin.from("categories").select("id", { count: "exact", head: true }).eq("is_published", true)),
    count(admin.from("categories").select("id", { count: "exact", head: true }).eq("is_published", true).or("seo_title.is.null,seo_title.eq.")),
    count(admin.from("product_images").select("id", { count: "exact", head: true }).or("alt_text.is.null,alt_text.eq.")),
    count(admin.from("legacy_redirects").select("id", { count: "exact", head: true }).eq("is_active", true)),
    count(admin.from("legacy_redirects").select("id", { count: "exact", head: true })),
    count(admin.from("seo_pages").select("id", { count: "exact", head: true })),
    count(admin.from("seo_pages").select("id", { count: "exact", head: true }).eq("indexable", false)),
  ]);

  const { blogPosts } = await import("@/content/blog-posts");
  // Rotas públicas estáticas indexáveis (espelha src/routes/sitemap[.]xml.ts)
  const STATIC_PUBLIC_PAGES = 31;
  const indexablePages =
    publishedProducts + publishedCategories + blogPosts.length + STATIC_PUBLIC_PAGES - seoPagesNoindex;

  return {
    integrations,
    metrics: {
      indexable_pages: indexablePages,
      published_products: publishedProducts,
      products_without_title: productsNoTitle,
      products_without_description: productsNoDesc,
      published_categories: publishedCategories,
      categories_without_title: categoriesNoTitle,
      images_without_alt: imagesNoAlt,
      active_redirects: activeRedirects,
      total_redirects: totalRedirects,
      seo_pages_registered: seoPages,
      seo_pages_noindex: seoPagesNoindex,
    },
  };
}

export function buildPublicTrackingConfig(settings: Record<string, any>): PublicTrackingConfig {
  const ga4 = (settings.integration_ga4 ?? {}) as Partial<Ga4Config>;
  const gtm = (settings.integration_gtm ?? {}) as Partial<GtmConfig>;
  const ads = (settings.integration_google_ads ?? {}) as Partial<GoogleAdsConfig>;
  const meta = (settings.integration_meta_pixel ?? {}) as Partial<MetaPixelConfig>;
  const gsc = (settings.integration_search_console ?? {}) as Partial<SearchConsoleConfig>;
  const general = (settings.seo_general ?? {}) as Record<string, string>;

  return {
    ga4: {
      enabled: ga4.enabled === true,
      measurement_id: ga4.measurement_id ?? "",
      install_method: ga4.install_method === "gtm" ? "gtm" : "gtag",
      environment: ga4.environment ?? "production",
    },
    gtm: {
      enabled: gtm.enabled === true,
      container_id: gtm.container_id ?? "",
      ga4_via_gtm: gtm.ga4_via_gtm === true,
      environment: gtm.environment ?? "production",
    },
    google_ads: {
      enabled: ads.enabled === true,
      ads_id: ads.ads_id ?? "",
      environment: ads.environment ?? "production",
    },
    meta_pixel: {
      enabled: meta.enabled === true,
      pixel_id: meta.pixel_id ?? "",
      environment: meta.environment ?? "production",
    },
    search_console_verification: gsc.verification_meta ?? "",
    canonical_domain: general.canonical_domain || "https://www.adeconex.com.br",
  };
}

/** Valida conteúdo de robots.txt. Retorna mensagem de erro ou null. */
export function validateRobotsTxt(content: string): string | null {
  if (!content.trim()) return "O robots.txt não pode ficar vazio.";
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  const sawUserAgent = lines.some((l) => /^user-agent\s*:/i.test(l));
  if (!sawUserAgent) return "O arquivo precisa declarar ao menos um bloco `User-agent:`.";
  // Bloqueio total acidental: User-agent: * seguido apenas de Disallow: / (sem Allow)
  let currentAgents: string[] = [];
  let disallowAll = false;
  let hasAllow = false;
  for (const l of lines) {
    if (/^user-agent\s*:/i.test(l)) {
      if (disallowAll && !hasAllow && currentAgents.includes("*")) {
        return "Bloqueio total detectado: `User-agent: *` com `Disallow: /` impedirá a indexação do site inteiro. Ajuste antes de salvar.";
      }
      currentAgents = [l.split(":")[1]?.trim() ?? ""];
      disallowAll = false;
      hasAllow = false;
      continue;
    }
    if (/^disallow\s*:\s*\/\s*$/i.test(l)) disallowAll = true;
    if (/^allow\s*:/i.test(l)) hasAllow = true;
  }
  if (disallowAll && !hasAllow && currentAgents.includes("*")) {
    return "Bloqueio total detectado: `User-agent: *` com `Disallow: /` impedirá a indexação do site inteiro. Ajuste antes de salvar.";
  }
  return null;
}

export function normalizePath(p: string): string {
  const t = p.trim();
  if (!t) return t;
  if (/^https?:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      return u.pathname + u.search;
    } catch {
      return t;
    }
  }
  return t.startsWith("/") ? t : `/${t}`;
}

/** Detecta loop simples de redirecionamento entre os redirects cadastrados. */
export function detectRedirectLoop(
  oldUrl: string,
  newUrl: string,
  existing: Array<{ old_url: string; new_url: string; is_active: boolean | null }>,
): string | null {
  const from = normalizePath(oldUrl);
  const to = normalizePath(newUrl);
  if (from === to) return "Loop direto: a URL de origem e destino são iguais.";
  const map = new Map(existing.filter((r) => r.is_active !== false).map((r) => [normalizePath(r.old_url), normalizePath(r.new_url)]));
  map.set(from, to);
  let cursor = to;
  for (let i = 0; i < 20; i++) {
    const next = map.get(cursor);
    if (!next) return null;
    if (next === from) return `Loop detectado: ${from} → ${to} → … → ${from}.`;
    cursor = next;
  }
  return "Cadeia de redirecionamentos muito longa (possível loop).";
}

export function isIntegrationKey(key: string): boolean {
  return (INTEGRATION_KEYS as string[]).includes(key);
}
