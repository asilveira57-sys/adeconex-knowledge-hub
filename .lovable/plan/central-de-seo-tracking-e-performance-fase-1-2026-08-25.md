# Central de SEO, Tracking e Performance — Fase 1

## Análise técnica do que já existe (não será duplicado)

| Recurso | Estado atual | Onde está |
|---|---|---|
| GA4 (gtag) | Implementado, ID via env `VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY` | `src/lib/analytics.ts` |
| Meta verification Search Console | Meta tag fixa no head | `src/routes/__root.tsx` |
| JSON-LD Organization | Hardcoded no root | `src/routes/__root.tsx` |
| BASE_URL / canonical | Constante em código | `src/lib/seo.ts` |
| sitemap.xml | Rota server dinâmica (rotas + blog) | `src/routes/sitemap[.]xml.ts` |
| robots.txt | Arquivo estático | `public/robots.txt` |
| SEO por produto (title/desc/keywords/canonical/indexable) | Tab no editor de produto | `seo-tab.tsx`, colunas em `products` |
| SEO por categoria | Colunas `seo_title`/`seo_description` em `categories` | banco |
| Redirecionamentos | Tabela `legacy_redirects` + admin por produto | `legacy-redirects.ts` |
| SEO de páginas | Tabela `seo_pages` (title, description, canonical, indexable) | banco |
| Permissões | `user_roles` (admin/editor/viewer) + `has_role()` | banco |
| **Ausente** | GTM, Google Ads, Meta Pixel, config central no DB, dashboard SEO, editor de robots, histórico | — |

## Estrutura proposta (Fase 1)

### Banco de dados (1 migration)

1. **`site_settings`** — tabela chave/valor (`key` text PK, `value` jsonb). Uma linha por módulo:
   - `seo_general` (nome do site, empresa, URL, meta padrão, og:image padrão, idioma, contatos, redes sociais, modelos de title `{produto} | {site}` etc.)
   - `integration_ga4`, `integration_gtm`, `integration_google_ads`, `integration_meta_pixel`, `integration_search_console` (enabled, IDs, método de instalação, ambiente)
   - `robots_txt` (conteúdo controlado pelo sistema)
   - Sem tabela nova por integração — modular e expansível.
   - Policies: leitura `authenticated` staff (`is_staff`); escrita só `admin`. Chaves sensíveis não vão para o frontend.
2. **`settings_history`** — (id, setting_key, changed_by, old_value, new_value, created_at). Gravada no server fn de update. Só admin lê.
3. **`seo_pages`** — ampliar (ALTER TABLE): robots meta (`index_follow`), og_title/og_description/og_image, twitter_*, priority, notas internas — para páginas institucionais/blog.
4. Reutilizar `legacy_redirects` para a central de redirecionamentos (já tem old_url/new_url/is_active/hits; adicionar `notes`).

Sem duplicar produtos/categorias/blog: produto continua com suas colunas SEO próprias; a central lê via queries agregadas.

### Server functions — `src/lib/seo-central.functions.ts`

- `getSeoCentralDashboard()` — agrega contagens reais: produtos publicados sem seo_title / sem seo_description, categorias sem seo_title, imagens sem alt (`product_images`), redirects ativos (`legacy_redirects`), páginas indexáveis (produtos published + categorias published + posts do blog + rotas estáticas), status de cada integração (lido de `site_settings`).
- `getSiteSetting(key)` / `updateSiteSetting(key, value)` — admin only (`has_role`), grava histórico.
- `getSettingsHistory(key?)` — admin only.
- Redirects: `listRedirects`, `upsertRedirect`, `toggleRedirect`, `deleteRedirect` + detecção simples de loop (a→b e b→a, ou a→a).
- `updateRobotsTxt` com validação: bloqueia salvar `Disallow: /` global sem confirmação explícita.

### Interface admin

Nova entrada no menu admin: **"SEO & Tracking"** (`/admin/seo`), com sub-rotas:

1. `/admin/seo` — Dashboard: cards de status das integrações (Conectado/Não configurado), métricas reais (sem title, sem description, imagens sem ALT, redirects, páginas indexáveis) com indicadores visuais.
2. `/admin/seo/configuracoes` — Configurações gerais + modelos de title por tipo de página.
3. `/admin/seo/paginas` — Lista páginas (de `seo_pages` + registro de novas) com editor completo: meta title/description com contadores, robots (4 opções), canonical, OG/Twitter, preview simulado do Google.
4. `/admin/seo/integracoes` — GA4, GTM, Google Ads, Meta Pixel, Search Console: ativar/desativar, IDs, método (gtag direto vs GTM — com aviso anti-duplicação), ambiente (produção/homologação/ambos). Search Console: campo da meta tag de verificação + URL do sitemap com botão copiar.
5. `/admin/seo/redirecionamentos` — CRUD de 301/302 sobre `legacy_redirects`, com alerta de loop.
6. `/admin/seo/tecnico` — Editor de robots.txt (com validação anti-bloqueio total) + status/URL do sitemap.

### Runtime (site público)

- `src/lib/analytics.ts` → passa a ler config do servidor (fetch de `integration_ga4`/`integration_gtm` exposta por server fn público restrito a campos não sensíveis). Regras: GTM ativo com "GA4 via GTM" ⇒ não injeta gtag direto. Meta Pixel injetado quando ativo e ambiente corresponde.
- Meta tag de verificação do Search Console passa a vir de `site_settings` (fallback para a tag atual hardcoded).
- SEO por produto e categoria: sem mudança de estrutura (já existe), apenas passa a ser contado no dashboard.

## O que fica fora da Fase 1 (conforme sua divisão)

- Fase 2: Schema editor avançado, Data Layer padronizado, eventos e-commerce completos, Consent Mode/LGPD, gerador de UTM, monitoramento de 404.
- Fase 3: auditoria automática, relatório de imagens, links internos, PageSpeed, Search Console API, dashboards históricos.

## Garantias

- Nenhuma alteração em carrinho, checkout, pagamentos, produtos ou pedidos.
- Toda configuração pode ser desativada sem quebrar o site (fallbacks atuais preservados).
- Credenciais (tokens Meta CAPI etc.) ficam só em secrets/backend — Fase 1 não expõe nada sensível no frontend.
