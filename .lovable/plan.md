## Estrutura encontrada

Já existem no banco:
- `coupons` — id, code (único), description, type (`percent | fixed | free_shipping`), value, min_order_amount, max_uses, max_uses_per_user, starts_at, expires_at, is_active. RLS: leitura autenticada + gestão staff.
- `coupon_redemptions` — coupon_id, order_id, user_id, amount. Único por (coupon_id, order_id).
- `orders.coupon_code` (text), `orders.discount_total` — já existem no snapshot do pedido.

Nenhum código no front/back usa cupons hoje (`carrinho`, `checkout`, `payments`, `orders` não referenciam `coupon_*`). Portanto vamos ligar o cupom sem alterar preço/frete/fechamento — só somamos ao `discount_total` e gravamos `orders.coupon_code`.

## Tabelas alteradas (uma migração pequena)

Extensão de `coupons` (todas nullable/default seguros — pedidos antigos continuam):
- `name text` (nome interno)
- `max_discount_per_order numeric` (limite por utilização)
- `max_total_discount numeric` (limite geral acumulado em R$)
- `applies_to_all_customers boolean default true`
- `applies_to_all_categories boolean default true`
- `applies_to_all_products boolean default true`
- `stack_with_promotions boolean default true` (acúmulo com promocional/bundle)
- `total_discount_used numeric default 0` (contador consolidado para concorrência)

Extensão de `coupon_redemptions`:
- `status text default 'reservado'` (`reservado|confirmado|cancelado|estornado`)
- `original_total`, `eligible_total`, `final_total` numeric
- índice por status para consultas

## Tabelas novas (mínimo indispensável)

Vínculos M:N — sem duplicar cadastros:
- `coupon_customers (coupon_id, user_id)` — clientes permitidos
- `coupon_categories (coupon_id, category_id, mode: 'include'|'exclude')`
- `coupon_products (coupon_id, product_id, mode: 'include'|'exclude')`

Todas com RLS: staff gerencia; leitura autenticada (para validação no server fn).

Case-insensitive: unique index em `lower(code)` (o unique atual em `code` continua, mas o server sempre normaliza para UPPER na gravação).

## Arquivos modificados

Backend (novos/alterados):
- `src/lib/coupons.shared.ts` — novo. Cálculo puro: dado cupom + linhas do carrinho (com product_id/category_ids) + user_id, retorna `{ eligible_total, discount, reason? }`. Ordem: exclui produtos excluídos → produtos incluídos (se houver lista) → exclui categorias excluídas → categorias incluídas → senão tudo. Aplica percent/fixed, respeita `max_discount_per_order` e teto por `max_total_discount - total_discount_used`.
- `src/lib/coupons.functions.ts` — novo. Server fns: `validateCoupon({ code })` (retorna preview), `applyCouponToCart({ code })` grava `carts.coupon_code`, `removeCouponFromCart()`, `getCartCouponPreview()` (usado pelo snapshot).
- `src/lib/cart.functions.ts` — `finalizeSnapshot` passa a considerar `carts.coupon_code`: revalida no servidor, calcula `coupon_discount`, expõe no `CartSnapshot` (`coupon: { code, name, discount, error? } | null`, `subtotal_after_discounts`). Nada de preço por linha; só campo agregado.
- `src/lib/payments.functions.ts` / criação do pedido — na finalização: dentro de uma transação PL/pgSQL (nova RPC `redeem_coupon(...)`), revalida tudo, insere `coupon_redemptions` com status `confirmado`, incrementa `coupons.total_discount_used`, grava `orders.coupon_code` + `discount_total += coupon_discount`. Se pedido cancelado/estornado, `refund_coupon(order_id)` marca redemption como `cancelado` e decrementa contador. Concorrência via `SELECT ... FOR UPDATE` no cupom.
- `src/lib/admin.functions.ts` — CRUD de cupons: `listCoupons`, `getCoupon`, `upsertCoupon`, `toggleCouponActive`, `duplicateCoupon`, `deleteCoupon` (bloqueia se houver redemptions), `getCouponStats` (utilizações, clientes distintos, total concedido, receita gerada, ticket médio, saldo restante, últimas utilizações), `searchCustomersForCoupon`, `searchProductsForCoupon`.

Frontend:
- `src/routes/_authenticated.admin.cupons.index.tsx` — listagem com busca, filtro por status derivado (Ativo/Agendado/Expirado/Esgotado/Inativo), ações (criar, editar, ativar/desativar, duplicar, excluir, utilizações).
- `src/routes/_authenticated.admin.cupons.$id.tsx` — editor completo (identificação, tipo/valor, regras financeiras, período, vínculos com clientes/categorias/produtos com busca, acúmulo com promoções) + painel de desempenho.
- `src/routes/_authenticated.admin.tsx` — adicionar item de nav "Cupons".
- `src/components/checkout/checkout-summary.tsx` + `src/routes/carrinho.tsx` — campo "Cupom de desconto" com Aplicar/Remover, mensagem de sucesso/erro, linhas Subtotal / Desconto do cupom / Frete / Total. Reaproveita recálculo já disparado pelo snapshot (mudanças de item/quantidade/endereço já invalidam a query do carrinho).

## Riscos de impacto no Checkout

- Baixos: cupom entra como campo agregado no snapshot; preço por linha e frete não mudam. Se o cupom ficar inválido durante a jornada, o snapshot devolve `coupon: { error }` e zera o desconto — checkout segue normal.
- Persistência do pedido: nova RPC transacional evita corrida em `max_uses` e `max_total_discount`. Falha na RPC = pedido não é criado (mantém o comportamento atual de "não perdi carrinho"), e o valor exibido é sempre o recalculado no server antes do Mercado Pago.
- Pedidos existentes: colunas novas são nullable/default; `orders.coupon_code` já existia.

## Ordem de execução

1. Migração (colunas + 3 tabelas de vínculo + RPCs `redeem_coupon` / `refund_coupon` + unique `lower(code)`).
2. `coupons.shared.ts` + `coupons.functions.ts` + integração no `finalizeSnapshot`.
3. UI: campo de cupom no carrinho/resumo do checkout.
4. Integração na criação do pedido (RPC) e cancelamento/estorno.
5. Admin: listagem, editor, desempenho.

## Fora de escopo

- Cupom de frete grátis (o enum já tem `free_shipping`, mas só disponibilizamos os tipos `percent` e `fixed` na UI agora, conforme pedido).
- Múltiplos cupons por pedido.
- Painel/dashboards agregados fora da tela do próprio cupom.
- Alterações em frete, kits, bundles, Mercado Pago ou Melhor Envio além de repassar `total`/`discount_total`.
