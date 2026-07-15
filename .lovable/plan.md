## Fase 12 — Notificações + QA end-to-end (sem compra de etiqueta no Melhor Envio)

Ajuste confirmado: Melhor Envio permanece **somente como cotador de frete**. A compra/impressão da etiqueta será feita no Olist quando essa integração for ativada. Portanto, esta fase **remove** qualquer plano de "comprar etiqueta pelo admin" e foca em comunicação com o cliente e validação ponta-a-ponta.

### 1. Notificações por e-mail (transacional)
Disparo automático via server functions, chamando o provedor de e-mail (Resend por padrão — pedirei a chave se ainda não existir).
- **Pedido recebido** — logo após `createOrderFromCart`.
- **Pagamento aprovado** — no webhook Mercado Pago, quando status vira `pago`.
- **Pagamento recusado / pendente** — no webhook, com link para retomar.
- **Arquivo de arte aprovado / precisa correção** — no `reviewOrderFile` do staff.
- **Pedido enviado** — quando admin muda status para `enviado` (inclui código de rastreio se preenchido).
- **Pedido entregue / cancelado** — nas transições correspondentes.

Templates HTML simples com identidade Adeconex (logo, vermelho `#e63946`, link para `/pedido/$id`). Registro de envio em `email_log` (tabela nova, RLS admin-only) para auditoria e reenvio manual.

### 2. Painel admin: reenviar notificação
Botão "Reenviar e-mail" em `/admin/pedidos/$id` (por evento) usando `email_log` como histórico. Sem UI de compra de etiqueta.

### 3. Ajustes de UI para deixar claro o fluxo de etiqueta
- Em `/admin/pedidos/$id`, o campo de rastreio continua **manual** (staff cola o código gerado no Olist).
- Legenda curta: "A etiqueta é gerada no Olist. Cole aqui o código de rastreio."
- Nada muda no checkout do cliente — Melhor Envio segue cotando normalmente.

### 4. QA end-to-end (checklist executável)
Roteiro em `.lovable/qa-fase12.md` + validação manual via Playwright headless:
1. Cadastro PF e PJ, endereço, empresa padrão.
2. Adicionar produto com variante ao carrinho, ver recálculo.
3. Checkout: endereço → cotação Melhor Envio real → pagamento Mercado Pago (sandbox).
4. Webhook Mercado Pago → pedido vira `pago` → e-mail disparado.
5. Upload de arte no `/pedido/$id`, aprovação pelo staff → e-mail ao cliente.
6. Admin muda status para `enviado` com código de rastreio manual → e-mail ao cliente.
7. Verificação de RLS: usuário B não acessa pedido/arquivo de A.
8. Lighthouse nas rotas públicas principais (meta ≥95 perf/SEO).

### Detalhes técnicos
- `src/lib/email.server.ts` — client Resend (ou provedor equivalente), lê `RESEND_API_KEY` dentro do handler.
- `src/lib/notifications.functions.ts` — uma função por evento, gravando em `email_log`.
- Migração: `email_log (id, order_id, event, to_email, status, error, sent_at)` + GRANTs + RLS (`is_staff` lê tudo; sem acesso anon/authenticated direto).
- Ganchos: `payments.functions.ts` (webhook), `order-files.functions.ts` (review), `orders.functions.ts` (transições de status).
- Sem novas dependências além do SDK do provedor de e-mail.

### Fora do escopo (confirmado)
- Compra/impressão de etiqueta via Melhor Envio — será feita no Olist futuramente.
- Ativação da integração Olist — segue desligada até você pedir.

Quer que eu use **Resend** como provedor (padrão recomendado, pede só `RESEND_API_KEY` e um domínio verificado) ou prefere outro?