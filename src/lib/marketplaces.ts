/**
 * Links de marketplace (Mercado Livre).
 *
 * Em vez de apontar para um anúncio específico (que muda de rota, vira catálogo
 * ou fica pausado), o padrão é gerar uma busca dentro da loja oficial usando o
 * título do produto. Um link direto por produto continua possível como exceção.
 */

export type MarketplaceSettings = {
  ml_enabled: boolean;
  ml_store_slug: string;
  ml_search_url_template: string;
  ml_store_url: string | null;
  ml_button_label: string;
  shopee_enabled: boolean;
  shopee_store_slug: string;
  shopee_search_url_template: string;
  shopee_store_url: string | null;
  shopee_button_label: string;
};

export const DEFAULT_MARKETPLACE_SETTINGS: MarketplaceSettings = {
  ml_enabled: true,
  ml_store_slug: "adeconex",
  ml_search_url_template: "https://lista.mercadolivre.com.br/{q}_Loja_{store}",
  ml_store_url: null,
  ml_button_label: "Comprar no Mercado Livre",
  shopee_enabled: true,
  shopee_store_slug: "adeconex",
  shopee_search_url_template: "https://shopee.com.br/shop/{store}/search?keyword={q}",
  shopee_store_url: null,
  shopee_button_label: "Comprar na Shopee",
};


/** Normaliza o termo para o formato de busca do Mercado Livre (hífens, sem acento). */
export function mlSearchSlug(term: string): string {
  return term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .slice(0, 10)
    .join("-");
}

export type MarketplaceProduct = {
  name: string;
  ml_search_term?: string | null;
  ml_url?: string | null;
  ml_enabled?: boolean | null;
  shopee_search_term?: string | null;
  shopee_url?: string | null;
  shopee_enabled?: boolean | null;
};

/** Palavras que não ajudam na busca da Shopee (unidades, quantidades, conectores). */
const SHOPEE_STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "com", "sem", "para", "por", "em", "e", "a", "o", "as", "os",
  "un", "und", "unid", "unidade", "unidades", "pct", "pacote", "caixa", "cx", "rolo", "rolos",
  "milheiro", "milheiros", "mil", "kit", "kits", "pcs", "pc", "cm", "mm", "mt", "mts", "metro",
  "metros", "x",
]);

/**
 * Normaliza o termo para a busca da Shopee.
 *
 * Títulos longos não retornam resultados dentro da loja, então reduzimos a
 * consulta às palavras-chave mais relevantes (sem acento, sem números soltos,
 * sem conectores/unidades) e limitamos a 4 termos.
 */
export function shopeeSearchQuery(term: string): string {
  return shopeeSearchQueryVariants(term)[0] ?? "";
}

/** Palavras-chave normalizadas do título, da mais relevante para a menos. */
function shopeeKeywords(term: string): string[] {
  const words = term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  const keywords = words.filter(
    (w) => w.length > 2 && !SHOPEE_STOPWORDS.has(w) && !/^\d+$/.test(w),
  );

  return keywords.length ? keywords : words;
}

/**
 * Variações progressivas do termo: 4 → 3 → 2 → 1 palavra-chave.
 *
 * A Shopee costuma não retornar nada para títulos longos; quando a primeira
 * variação falha, o cliente pode tentar a seguinte (mais curta e mais ampla).
 */
export function shopeeSearchQueryVariants(term: string): string[] {
  const keywords = shopeeKeywords(term);
  if (!keywords.length) return [];

  const variants: string[] = [];
  for (let n = Math.min(4, keywords.length); n >= 1; n--) {
    const q = keywords.slice(0, n).join(" ");
    if (!variants.includes(q)) variants.push(q);
  }
  return variants;
}


/** Página da loja oficial na Shopee (sem busca), usada como fallback seguro. */
function shopeeStoreFallback(settings: MarketplaceSettings): string | null {
  if (settings.shopee_store_url) return settings.shopee_store_url;
  const slug = (settings.shopee_store_slug || "").trim();
  if (!slug) return null;
  return /^\d+$/.test(slug)
    ? `https://shopee.com.br/shop/${slug}`
    : `https://shopee.com.br/${encodeURIComponent(slug)}`;
}

/**
 * URL final do botão "Comprar na Shopee" — ou null quando desativado.
 *
 * A Shopee só aceita busca restrita à loja pelo ID numérico da loja
 * (`/shop/{shopId}/search?keyword=`). Sem esse ID, a busca sairia aberta para
 * qualquer vendedor, então caímos na página da loja oficial.
 */
export function shopeeUrl(
  product: MarketplaceProduct,
  settings: MarketplaceSettings = DEFAULT_MARKETPLACE_SETTINGS,
): string | null {
  if (!settings.shopee_enabled) return null;
  if (product.shopee_enabled === false) return null;
  if (product.shopee_url && /^https?:\/\//i.test(product.shopee_url)) return product.shopee_url;

  const term = (product.shopee_search_term || product.name || "").trim();
  const q = shopeeSearchQuery(term);
  const store = (settings.shopee_store_slug || "").trim();

  // Busca dentro da loja exige shopId numérico; caso contrário, loja oficial.
  if (!q || !/^\d+$/.test(store)) return shopeeStoreFallback(settings);

  const template = settings.shopee_search_url_template || DEFAULT_MARKETPLACE_SETTINGS.shopee_search_url_template;
  const url = template
    .replace(/\{q\}/g, encodeURIComponent(q))
    .replace(/\{store\}/g, encodeURIComponent(store));
  // Segurança: se o modelo não escopa a loja, não abre busca global.
  return url.includes(store) ? url : shopeeStoreFallback(settings);
}

export type ShopeeAttempt = { query: string | null; url: string; label: string };

/**
 * Cadeia de tentativas: termo completo → variações mais curtas → loja oficial.
 * Usada para oferecer alternativas quando a primeira busca não retorna nada.
 */
export function shopeeUrlVariants(
  product: MarketplaceProduct,
  settings: MarketplaceSettings = DEFAULT_MARKETPLACE_SETTINGS,
): ShopeeAttempt[] {
  const primary = shopeeUrl(product, settings);
  if (!primary) return [];
  if (product.shopee_url && /^https?:\/\//i.test(product.shopee_url)) {
    return [{ query: null, url: primary, label: "Link direto do anúncio" }];
  }

  const store = (settings.shopee_store_slug || "").trim();
  const storeUrl = shopeeStoreFallback(settings);
  const attempts: ShopeeAttempt[] = [];

  if (/^\d+$/.test(store)) {
    const template =
      settings.shopee_search_url_template || DEFAULT_MARKETPLACE_SETTINGS.shopee_search_url_template;
    const term = (product.shopee_search_term || product.name || "").trim();
    for (const q of shopeeSearchQueryVariants(term)) {
      const url = template
        .replace(/\{q\}/g, encodeURIComponent(q))
        .replace(/\{store\}/g, encodeURIComponent(store));
      if (url.includes(store)) attempts.push({ query: q, url, label: `Buscar por "${q}"` });
    }
  }

  if (storeUrl) attempts.push({ query: null, url: storeUrl, label: "Ver a loja oficial" });
  return attempts.length ? attempts : [{ query: null, url: primary, label: "Comprar na Shopee" }];
}


/** URL final do botão "Comprar no Mercado Livre" — ou null quando desativado. */
export function mercadoLivreUrl(
  product: MarketplaceProduct,
  settings: MarketplaceSettings = DEFAULT_MARKETPLACE_SETTINGS,
): string | null {
  if (!settings.ml_enabled) return null;
  if (product.ml_enabled === false) return null;
  if (product.ml_url && /^https?:\/\//i.test(product.ml_url)) return product.ml_url;

  const term = (product.ml_search_term || product.name || "").trim();
  const q = mlSearchSlug(term);
  if (!q) return settings.ml_store_url || null;

  const store = mlSearchSlug(settings.ml_store_slug || "");
  const template = settings.ml_search_url_template || DEFAULT_MARKETPLACE_SETTINGS.ml_search_url_template;
  return template.replace(/\{q\}/g, q).replace(/\{store\}/g, store);
}
