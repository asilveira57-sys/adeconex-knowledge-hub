## Objetivo
Adicionar "Compre Junto" ao Adeconex 2030 sem criar módulo separado. Reaproveitar `products`, `product_variants` (kits), `cart_items` e `order_items`. Vantagem = desconto (percentual, fixo, preço fechado, ou desconto só no complementar) aplicado somente quando todos os itens obrigatórios estiverem no carrinho.

## Banco (uma migração)

Reaproveitamos onde possível. Criar apenas:

- `bundle_offers`
  - `product_id` (produto âncora — onde a oferta aparece)
  - `name` interno, `slug` opcional, `sort_order`, `is_active`
  - `discount_type`: `percent | fixed | fixed_price | complement_percent | complement_fixed`
  - `discount_value numeric` (percentual, valor, ou preço fechado)
  - `allow_stack_with_coupon boolean default false`
  - `starts_at`, `ends_at` (opcional)
  - contadores de telemetria: `impressions`, `add_to_cart_count`, `conversions`, `revenue_total`, `discount_total`
- `bundle_offer_items`
  - `offer_id`, `product_id`
  - `variant_id` (nullable — variação/kit obrigatório)
  - `variant_scope`: `any | specific | any_kit` (para "todos os kits ativos")
  - `quantity int` (obrigatória por conjunto)
  - `is_anchor boolean` (marca o produto principal)
  - `is_complement_target boolean` (usado por `complement_*` para saber onde aplicar desconto)
  - `sort_order`

RLS: leitura pública para ofertas ativas dentro da janela; escrita apenas staff. GRANT `select` para `anon` + `authenticated`; `all` para `service_role`.

Sem tabela de "aplicações" — a aplicação é derivada no carrinho a partir dos itens presentes; telemetria de vendas é incrementada na conclusão do pedido.

Reaproveitamento: nenhuma mudança em `products`. `cart_items.metadata` já é jsonb — usamos `metadata.bundle` para marcar `{ offer_id, role: 'anchor'|'complement' }`. `order_items.metadata` recebe o mesmo snapshot no checkout. `orders.metadata.bundle_discounts` guarda o resumo por oferta (id, nome, conjuntos aplicados, desconto).

## Backend

**`src/lib/bundles.functions.ts`** (novo, client-safe wrapper)
- `listBundleOffersForProduct(product_id)` — público, retorna ofertas ativas + itens + snapshot de preço/imagem de cada participante (usa cliente publishable server-side).
- `computeBundleApplications(cartItems)` — helper puro; dado o carrinho, retorna: `[{ offer_id, applications: N, per_conjunto_discount, total_discount, affected_item_ids }]`. Regras:
  - conta quantos conjuntos completos cabem (min de floor(qty_item / qty_required) para cada item obrigatório, respeitando `variant_scope`);
  - aplica desconto apenas nas N unidades correspondentes por item; excedente fica com preço cheio;
  - se duas ofertas competem pelos mesmos itens, escolhe a de maior `total_discount` (greedy por desconto/conjunto desc);
  - `complement_*` aplica só nos itens marcados `is_complement_target`.
- `addBundleToCart({ offer_id, selections })` — valida estoque de TODOS os itens antes; insere cada item via lógica existente com `metadata.bundle = { offer_id, role }`; falha atômica (rollback dos inserts já feitos) se algum estoque faltar.

**`src/lib/cart.functions.ts`**
- Estender `getMyCart`/`hydrateAnonymousCart`: depois de montar linhas, rodar `computeBundleApplications` e devolver no snapshot:
  - `bundle_discounts: [{ offer_id, name, applications, discount_total, savings_label }]`
  - `subtotal` = subtotal cheio − soma de descontos de bundle
  - por linha, `bundle_applied_qty` e `bundle_discount_applied` (para UI)
- Nenhuma mudança em preços gravados; desconto é calculado, não persistido nas linhas.

**`src/lib/checkout.functions.ts`**
- `getCheckoutSnapshot` já usa carrinho — herda os descontos.
- Ao criar pedido: preencher `orders.discount_total` com soma dos bundles + cupom; gravar `orders.metadata.bundle_discounts` e por item `order_items.metadata.bundle` e `discount` proporcional. Incrementar contadores `conversions/revenue_total/discount_total` na oferta (best-effort, dentro da mesma transação de finalização).

**`src/lib/payments.functions.ts`** — nada muda além de já usar o `total` recalculado.

**`src/lib/admin.functions.ts`**
- `listBundleOffers(product_id)`, `upsertBundleOffer(offer + items[])`, `deleteBundleOffer`, `duplicateBundleOffer`, `toggleBundleOfferActive`.
- `searchProductsForBundle(q)` — busca por nome/SKU (limite 20) para o seletor.

**Frete e conflitos**
- Frete: nada muda — cada linha continua com seu peso/dimensões/kit.
- Cupom: no cálculo do cupom, ignorar itens já cobertos por bundle a menos que `allow_stack_with_coupon = true` na oferta. Ordem: promocional do produto → bundle → cupom → desconto geral.

## Frontend

**Admin — `src/routes/_authenticated.admin.produtos.$id.tsx`**
- Novo card `BundleOffersCard` abaixo do `KitsCard`. Lista de ofertas com editor inline (drawer/dialog): nome, itens (busca produto → escolher variação/kit ou "qualquer kit ativo" → quantidade → marcar âncora/alvo do desconto complementar), tipo/valor de desconto, datas, ativo, ordem, "permitir acumular com cupom". Mostra preço normal do conjunto e preço final simulado. Ações: editar, duplicar, excluir.

**Produto — `src/routes/produto.$slug.tsx`**
- Novo componente `BundleOffersSection` abaixo das informações principais. Para cada oferta ativa: cards dos itens (imagem, nome, variação/kit, quantidade, preço), preço normal, desconto, preço final, economia em R$, botão "Adicionar conjunto ao carrinho". Quando `variant_scope='any'` ou `any_kit`, exigir seleção antes de habilitar o botão. Registra impressão (fire-and-forget) uma vez por sessão.

**Carrinho — `src/routes/carrinho.tsx` + `CheckoutSummary`**
- Renderizar acima do subtotal um bloco "Oferta Compre Junto aplicada" por oferta, com preço normal, desconto e economia. Nas linhas afetadas, badge discreta "Compre Junto".
- Se validação quebrar (item removido, quantidade insuficiente, variação trocada), simplesmente parar de exibir o desconto — o cálculo já é derivado; toast informativo apenas quando o próprio usuário reduzir/remover um item marcado como bundle.

**Pedido (cliente/admin)**
- Exibir seção "Ofertas aplicadas" a partir de `orders.metadata.bundle_discounts`.

## Telemetria
- Impressão: `impressions++` server fn simples chamada pelo produto (uma vez por sessão por oferta).
- Adição ao carrinho: `add_to_cart_count++` em `addBundleToCart`.
- Conversão: incrementos em `conversions`, `revenue_total`, `discount_total` no fechamento do pedido pago.
- Nada de painel BI agora — só campos prontos.

## Ordem de implementação
1. Migração (`bundle_offers`, `bundle_offer_items`, grants, RLS, índices por `product_id`, `is_active`).
2. Server fns públicas de leitura + `computeBundleApplications` puro (com testes rápidos manuais no carrinho).
3. Integração no snapshot do carrinho (desconto derivado).
4. Card admin com CRUD.
5. Seção na página do produto + `addBundleToCart` com validação de estoque.
6. Renderização no carrinho + resumo do checkout.
7. Persistência no pedido + interação com cupom (respeitar `allow_stack_with_coupon`).
8. Contadores de telemetria.

## Fora de escopo
- Novo módulo/rota dedicada de "promoções".
- Alteração de `products.price`.
- Painel de BI/relatórios visuais.
- Mudanças em frete, kits, Mercado Pago ou Melhor Envio além de repassar `total`/`metadata`.
