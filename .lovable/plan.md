## Objetivo
Habilitar venda por embalagens/kits fechados reaproveitando a tabela `product_variants` como "opção de kit", sem criar módulo novo. Produtos com o flag ativado só permitem selecionar caixas/kits pré-cadastrados (Unidade, Kit 5, Kit 10, etc.) — sem digitar quantidade livre em unidades. Produtos sem o flag mantêm o comportamento atual.

## Alterações de banco (uma migração)
Reaproveitar `product_variants` como "kit". Adicionar apenas o necessário:

- `products.sells_by_kit boolean not null default false`
- `product_variants.units_per_pack integer not null default 1` — unidades dentro do kit
- `product_variants.is_kit boolean not null default false` — marca a linha como opção de kit
- `product_variants.is_active boolean not null default true` — status ativo/inativo
- `product_variants.stock_mode text not null default 'own'` — `own` (estoque próprio em caixas) ou `derived` (calculado a partir do estoque unitário do produto)

Dimensões/peso da caixa já existem em `product_variants` (`weight_kg`, `width_mm/cm`, `height_mm/cm`, `length_mm/cm`, `insurance_value`), então são reutilizados. `sku`, `price`, `promotional_price`, `sort_order` também já existem.

Sem seed novo. Migração é aditiva — pedidos e produtos atuais continuam funcionando.

## Backend (server functions)

**`src/lib/admin.functions.ts`**
- Estender `updateProductBasic`/salvar produto: aceitar `sells_by_kit`.
- Adicionar CRUD de kits: `upsertProductKit`, `deleteProductKit` (na verdade upsert em `product_variants` com `is_kit=true`).

**`src/lib/catalog.functions.ts`**
- Retornar `sells_by_kit` no produto e filtrar variantes com `is_kit=true, is_active=true` quando aplicável. Incluir `units_per_pack`, `stock_mode` e resolver estoque efetivo (`own` → `stock_quantity`; `derived` → `floor(product.stock_quantity / units_per_pack)`).

**`src/lib/cart.functions.ts`**
- `addToCart` e hidratação: quando o produto vende por kit, exigir `variant_id` de um kit ativo; `quantity` representa nº de caixas (não unidades).
- Snapshot de linha: incluir `units_per_pack`, `total_units = quantity * units_per_pack`, `unit_price` do kit, `line_total = quantity * unit_price`, dimensões/peso do kit no `metadata`.
- Validação de estoque: usar estoque em caixas (modo `own`) ou derivar do estoque unitário (modo `derived`), rejeitando excesso.

**`src/lib/shipping.functions.ts` e `shipping-preview.functions.ts`**
- Ao montar `products[]` para o Melhor Envio: quando o item vier de um kit, usar peso/dimensões da caixa (variant) e enviar `quantity = nº de caixas` (a API já trata cada `quantity` como volume). Sem kit, comportamento atual.

**`src/lib/checkout.functions.ts` / `orders.functions.ts`**
- `order_items.metadata` recebe `units_per_pack`, `total_units`, dimensões da caixa. `product_sku`/`variant_label` já cobrem identificação. Sem mudança de schema em pedidos.

## Frontend

**Admin — `src/routes/_authenticated.admin.produtos.$id.tsx`**
- Toggle "Venda por kits fechados" no card básico.
- Novo card "Opções de kit" (quando ligado): tabela editável com nome, unidades por kit, SKU, preço, preço promocional, estoque (modo + valor), peso/dimensões da caixa, ativo, ordem. Botões adicionar/remover.

**Produto — `src/routes/produto.$slug.tsx`**
- Quando `sells_by_kit`, substituir o seletor atual de variantes por cards/botões de kit (Unidade / Caixa com 5 / …). Ao selecionar: recalcular preço da caixa, preço por unidade, estoque em caixas, e passar dimensões da caixa para `ShippingCepQuote`.
- Campo de quantidade passa a se chamar "Caixas" com máx = estoque em caixas do kit. Exibir "N caixas × M un = X unidades".

**Carrinho — `src/routes/carrinho.tsx` + `CheckoutSummary`**
- Exibir, nas linhas com kit, "3 caixas com 20 unidades — total 60 unidades" e SKU do kit.

**Painel de pedidos (cliente e admin)**
- Renderizar `metadata.units_per_pack`/`total_units` quando presente.

## Ordem de implementação
1. Migração + regeneração de types.
2. Admin: flag + CRUD de kits.
3. Catálogo + página do produto (seleção de kit, sem quantidade livre).
4. Carrinho (persistência do kit, validações de estoque em caixas).
5. Frete (peso/dimensões da caixa, quantidade = volumes).
6. Exibição em pedido/checkout.

## Fora de escopo
- Nenhum novo módulo, tabela de "kits" separada, ou mudança em Mercado Pago/checkout além de repassar `metadata`.
- Produtos sem o flag ficam intocados.
