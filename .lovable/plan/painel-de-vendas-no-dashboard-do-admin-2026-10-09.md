# Painel de vendas no Dashboard do admin

O objetivo é ver, em uma tela só, de onde vêm as visitas, quanto vira pedido e onde se perde venda.

## O que aparece no painel

Filtro de período no topo (hoje, 7 dias, 30 dias, 90 dias ou personalizado), com comparação ao período anterior (↑/↓ %).

**1. Visitas**
- Visitas totais e visitantes únicos
- Gráfico de visitas por dia
- Origem das visitas: Google, direto, Instagram, WhatsApp, outros sites
- Celular x computador
- Páginas mais vistas

**2. Vendas**
- Faturamento pago, número de pedidos, pedidos pagos e ticket médio
- Gráfico de faturamento por dia
- Pedidos por situação: aguardando pagamento, pago, em produção, enviado, entregue, cancelado
- Forma de pagamento: Pix, cartão, boleto
- Frete: valor total cobrado e transportadoras mais usadas
- Cupons: quantidade de usos e desconto concedido

**3. Funil de conversão**
- Visitas → viu produto → adicionou ao carrinho → iniciou checkout → pedido criado → pago
- Mostra a percentagem em cada etapa, para ver onde o cliente desiste
- Taxa de conversão: pedidos pagos ÷ visitantes únicos

**4. Carrinho abandonado e pagamento pendente**
- Carrinhos com itens e sem compra há mais de 24 horas: quantidade e valor parado
- Pedidos "aguardando pagamento" há mais de 24 horas: lista com cliente, valor e botão de WhatsApp para retomar o contato
- Lista de carrinhos abandonados de clientes logados, com nome, itens e valor

**5. Produtos**
- Produtos mais visitados
- Produtos mais vendidos, em unidades e em faturamento
- Muito visitados e pouco vendidos: indica problema de preço, foto ou descrição
- Mais adicionados ao carrinho sem compra

**6. Clientes**
- Clientes novos no período
- Clientes que compraram mais de uma vez (recompra)
- PF x PJ em pedidos e faturamento
- Vendas por estado

Os cards atuais do catálogo (sem imagem, sem preço etc.) continuam em uma aba "Catálogo".

## Como as visitas serão contadas

Hoje o site manda as visitas para o Google Analytics, mas o painel não consegue ler esses números de volta sem uma integração mais complexa. Por isso o site passa a registrar as próprias visitas:
- Cada página vista, mais as aberturas de produto e os "adicionar ao carrinho"
- Visitante identificado por um código anônimo no navegador, sem dados pessoais
- Robôs e visitas do próprio admin ficam de fora

Os números de visitas só começam a contar a partir da publicação. Pedidos, vendas e carrinhos já aparecem com o histórico completo.

## Permissões

O painel fica na seção Dashboard. Colaboradores sem permissão de pedidos veem só os números de visitas e de produtos, sem valores nem nomes de clientes.

## Fora desta etapa

- Leitura direta dos números do Google Analytics
- E-mail automático de carrinho abandonado (fica para quando os e-mails estiverem configurados)

## Detalhes técnicos

- Nova tabela `site_events` (session_id, visitor_id, event_type: page_view/view_item/add_to_cart/begin_checkout, path, product_id, referrer_host, utm_source, device, created_at), com índices em created_at, event_type e product_id. Insert anônimo via server route pública com validação, limite de tamanho e filtro de bot por user-agent; sem SELECT para anon; leitura feita por staff.
- Tracker leve em `__root.tsx`, chamado na mudança de rota e nos hooks já existentes de `src/lib/analytics.ts` (view_item, add_to_cart, begin_checkout); usa `navigator.sendBeacon`. Rotas /admin ignoradas.
- `src/lib/dashboard.functions.ts` com `getSalesDashboard({from, to})`, protegido por requireSupabaseAuth e is_staff. Agrega orders, order_items, carts/cart_items, coupon_redemptions, profiles, order_addresses e site_events. Valores monetários são removidos quando o usuário não tem a seção "pedidos".
- Carrinho abandonado: carts com status active, com itens e updated_at anterior a 24 horas.
- Gráficos com recharts (já disponível via shadcn chart); dashboard reescrito em abas Vendas / Visitas / Produtos / Catálogo.
- Verificação: Playwright com sessão admin, conferindo os totais contra consultas SQL.
