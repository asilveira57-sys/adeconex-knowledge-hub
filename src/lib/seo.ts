/**
 * Central SEO constants. BASE_URL aponta para o domínio final da plataforma
 * (onde a Adeconex vai servir o novo site após o cutover). Todos os canonical,
 * og:url e o sitemap.xml usam este valor.
 */
export const BASE_URL = "https://adeconex.com.br";

export const absoluteUrl = (path: string) =>
  `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Cabeçalhos de cache para páginas PÚBLICAS renderizadas no servidor.
 * O HTML não depende de login (sessão fica no navegador), então pode ser
 * cacheado na borda por 5 min e servido "velho" enquanto revalida.
 * Preço/estoque são revalidados no carrinho e no checkout.
 * Nunca usar em rotas autenticadas (_authenticated.*), carrinho ou pagamento.
 */
export const PUBLIC_PAGE_CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=86400",
} as const;
