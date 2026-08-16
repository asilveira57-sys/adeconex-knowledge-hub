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
  shopee_search_url_template: "https://shopee.com.br/search?keyword={q}&shop={store}",
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

/** Normaliza o termo para a busca da Shopee (palavras separadas, sem acento, URL-encoded). */
export function shopeeSearchQuery(term: string): string {
  return term
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 10)
    .join(" ");
}

/** URL final do botão "Comprar na Shopee" — ou null quando desativado. */
export function shopeeUrl(
  product: MarketplaceProduct,
  settings: MarketplaceSettings = DEFAULT_MARKETPLACE_SETTINGS,
): string | null {
  if (!settings.shopee_enabled) return null;
  if (product.shopee_enabled === false) return null;
  if (product.shopee_url && /^https?:\/\//i.test(product.shopee_url)) return product.shopee_url;

  const term = (product.shopee_search_term || product.name || "").trim();
  const q = shopeeSearchQuery(term);
  if (!q) return settings.shopee_store_url || null;

  const store = (settings.shopee_store_slug || "").trim();
  const template = settings.shopee_search_url_template || DEFAULT_MARKETPLACE_SETTINGS.shopee_search_url_template;
  return template
    .replace(/\{q\}/g, encodeURIComponent(q))
    .replace(/\{store\}/g, encodeURIComponent(store));
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
