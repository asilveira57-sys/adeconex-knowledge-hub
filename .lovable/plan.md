
# Adeconex 2030 → E-commerce completo

Escopo enorme. Não dá para entregar tudo em uma única rodada sem quebrar o que já funciona. Proposta: entregar por **fases pequenas e testáveis**, cada uma aprovada antes da próxima. Abaixo o plano completo; começo pela Fase 1 (Auditoria) assim que você aprovar.

## Estado atual (do que já sei)

- **Stack**: TanStack Start + Supabase (Lovable Cloud). Auth por e-mail/senha já ativo (`/auth`), gate em `_authenticated`.
- **Catálogo**: 21 tabelas já existem — `products`, `product_variants`, `product_categories`, `categories`, `brands`, `product_images` (bucket público `catalog-media`), `product_faqs`, `product_specifications`, `materials`, `applications`, `markets`, `legacy_redirects` etc. 829 produtos importados.
- **Roles**: tabela `user_roles` + `has_role`/`is_staff`. Admin em `/admin`.
- **Front público**: home, `/catalogo`, `/produto/$slug`, páginas institucionais, avaliações Google, redirects 301.
- **Faltando para e-commerce**: perfil estendido (CPF/CNPJ/empresa), endereços, carrinho, checkout, pedidos, pagamentos, frete, arquivos do cliente, integrações Mercado Pago / Melhor Envio / sistema interno.

## Decisões que preciso confirmar antes de começar

1. **Mercado Pago**: você tem conta e credenciais de **teste (sandbox)**? Vou precisar de `MP_ACCESS_TOKEN` (test) para começar. Live só depois de tudo validado.
2. **Melhor Envio**: conta + credenciais OAuth (client_id/secret) do **sandbox**? CEP de origem da Adeconex?
3. **"Sistema interno"** que recebe o pedido: já existe endpoint/URL/token, ou fica como estrutura preparada (log + botão reenviar) até você definir?
4. **Convivência com marketplaces**: o site hoje direciona para marketplaces. O e-commerce próprio **substitui** ou **coexiste** com esses CTAs?
5. **Cadastro obrigatório no checkout** (recomendado, dado que há envio de arquivo e acompanhamento) — confirma?
6. **Escopo inicial**: posso começar pelas Fases 1–4 (auditoria + banco + conta do cliente + carrinho) sem tocar em pagamento/frete ainda? É o caminho mais seguro.

## Fases

### Fase 1 — Auditoria (entrego relatório, sem código)
Mapa detalhado das tabelas atuais (colunas, RLS, grants), autenticação, componentes reaproveitáveis, campos faltantes por tabela, riscos. Saída: documento aprovando o desenho da Fase 2.

### Fase 2 — Banco de dados (migrations aditivas)
Novas tabelas, preservando o catálogo atual:
- `profiles` — estender com `cpf`, `phone`, `whatsapp`, `birth_date`, `customer_type`
- `companies`, `customer_addresses`
- `carts`, `cart_items`
- `orders`, `order_items`, `order_addresses`, `order_status_history`
- `payments`, `payment_events`
- `shipping_quotes`, `shipments`
- `order_files` (bucket **privado** `order-files`)
- `coupons`, `coupon_redemptions`
- `integration_logs`
- Sequência para `order_number` (`ADC-YYYY-NNNNNN`)
- RLS: cliente vê só o seu; admin/editor vê tudo; GRANTs obrigatórios.

### Fase 3 — Conta do cliente
`/minha-conta` (visão geral, perfil, empresa, endereços, pedidos, arquivos). Formulários com validação zod, viacep para CEP, máscaras CPF/CNPJ.

### Fase 4 — Catálogo + variações no front
Completar variações (`product_variants` já existe) na página de produto, seleção de opções, preço/estoque por variação.

### Fase 5 — Carrinho persistente
`/carrinho`, server functions para add/update/remove, merge do carrinho anônimo (localStorage) no login, validação de estoque, quantidade mínima, múltiplos.

### Fase 6 — Checkout multi-etapa
`/checkout/{endereco,frete,revisao,pagamento}`. Recalculo de preços **no servidor** a cada etapa.

### Fase 7 — Melhor Envio (cotação apenas)
Server function `quoteShipping` → API sandbox. Persiste `shipping_quotes` com `quote_token` e `expires_at`. Sem compra automática de etiqueta.

### Fase 8 — Mercado Pago (sandbox)
- `createOrderAndPreference` (cria `orders` como `aguardando_pagamento`, gera `preference_id`)
- Server route pública `/api/public/webhooks/mercadopago` — valida assinatura, consulta MP com o `payment_id`, é idempotente via `payment_events.event_key`
- Páginas `/pagamento/{aprovado,pendente,recusado}` que **consultam status interno**, não confiam no query param
- Reserva/baixa de estoque só após confirmação segura

### Fase 9 — Pedidos (cliente + admin)
Painel do cliente com timeline; painel admin em `/admin/pedidos` com filtros, ações (aprovar arquivo, gerar etiqueta manualmente, inserir rastreio, reenviar integração, cancelar).

### Fase 10 — Arquivos do cliente
Upload em bucket **privado** com signed URLs, vinculado a `order_item`, fluxo de aprovação.

### Fase 11 — Integração sistema interno
Server function assíncrona + `integration_logs` + retry com backoff + botão "Reenviar" no admin. Falha aqui **não** cancela pedido.

### Fase 12 — Compra de etiqueta Melhor Envio (manual pelo admin) + notificações por e-mail + testes end-to-end + go-live

## Regras técnicas que vou seguir (do seu prompt)

- Nunca confiar em preço do front — recálculo server-side sempre.
- Webhook Mercado Pago valida assinatura + consulta MP + idempotente.
- Credenciais só em secrets (`add_secret`), nunca em código.
- RLS estrita: cliente só vê o próprio; arquivos em bucket privado.
- Numeração de pedido via sequência Postgres.
- Nada de "simulado como real": sandbox de verdade nas duas integrações.

## Secrets que vou pedir quando chegar a hora (não agora)

- `MERCADOPAGO_ACCESS_TOKEN` (sandbox → depois live)
- `MERCADOPAGO_WEBHOOK_SECRET`
- `MELHORENVIO_CLIENT_ID`, `MELHORENVIO_CLIENT_SECRET`, `MELHORENVIO_SANDBOX=true`
- `INTERNAL_SYSTEM_URL`, `INTERNAL_SYSTEM_TOKEN` (quando existir)

## O que peço agora

Responda às 6 perguntas acima (principalmente 1, 2, 3 e 6). Com isso aprovado, começo **imediatamente pela Fase 1 (auditoria)** e depois entrego a Fase 2 (migração de banco) para sua aprovação — sem tocar em nada que já funciona.
