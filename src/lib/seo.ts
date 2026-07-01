/**
 * Central SEO constants. BASE_URL aponta para o domínio final da plataforma
 * (onde a Adeconex vai servir o novo site após o cutover). Todos os canonical,
 * og:url e o sitemap.xml usam este valor.
 */
export const BASE_URL = "https://www.adeconex.com.br";

export const absoluteUrl = (path: string) =>
  `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
