# E-mails automáticos da Adeconex + menu "E-mails" no admin

## Passo 1 — Configuração do domínio (você faz, uma vez)
1. Clicar em "Configurar domínio de e-mail" e informar **adeconex.com.br**.
2. O sistema cria um endereço técnico de envio (ex.: notify.adeconex.com.br) e mostra 2 registros do tipo **NS**.
3. No painel onde o domínio está registrado (Registro.br, Cloudflare, Hostinger etc.), criar esses 2 registros NS para o subdomínio "notify". Não mexe no e-mail atual vendas@ nem no site.
4. Aguardar a verificação (de minutos até 72 h). O status aparece em Cloud → Emails.
5. Remetente visível: "Adeconex <...@adeconex.com.br>"; respostas dos clientes vão para **vendas@adeconex.com.br**.

Enquanto o domínio verifica, eu já construo tudo; os e-mails começam a sair sozinhos quando a verificação terminar.

## Passo 2 — Lista de e-mails

Conta
- Boas-vindas ao criar a conta
- Cadastro atualizado (aviso de segurança quando e-mail/senha mudam)
- (Confirmação de cadastro e redefinição de senha já existem; ganham a identidade visual da Adeconex)

Pedidos
- Pedido recebido (aguardando pagamento, com resumo e link do Pix/pagamento)
- Primeiro pedido (versão especial de agradecimento, substitui o "pedido recebido" na primeira compra)
- Pagamento confirmado
- Pagamento recusado / expirado (com link para tentar de novo)
- Pedido em produção / arte aprovada (para personalizados)
- Pedido enviado (transportadora + código de rastreio)
- Pedido entregue (agradecimento + pedido de avaliação no Google)
- Pedido cancelado

Contato e conteúdo
- Formulário de contato/orçamento: confirmação para o cliente
- Formulário de contato: aviso interno para vendas@ com os dados
- Newsletter: agradecimento pela inscrição (só a confirmação; ver observação)
- Download: e-mail com o link do driver/manual (ver observação)

## Passo 3 — Menu "E-mails" no admin
- Lista de todos os e-mails com liga/desliga, assunto e última edição.
- Editor por e-mail: assunto, texto de abertura, corpo, texto do botão e mensagem final, com variáveis prontas ({nome}, {numero_pedido}, {total}, {rastreio}, {transportadora}, {link}).
- Pré-visualização ao vivo e botão "Enviar teste para mim".
- Histórico de envios (enviado, falhou, bloqueado) com filtro por e-mail e período.
- Acesso controlado pela permissão de colaboradores ("emails").

## Observações importantes
- **Newsletter**: hoje o site não tem formulário de newsletter. Eu crio o formulário (rodapé) e o e-mail de agradecimento. Enviar campanhas/promoções para a lista não é possível por aqui — isso exige uma ferramenta de e-mail marketing (ex.: RD Station, Mailchimp); misturar prejudica a entrega dos e-mails de pedido.
- **Download**: hoje baixar é livre, sem pedir e-mail. Para mandar e-mail, o download precisaria pedir o e-mail antes. Proposta: campo opcional "Receber o link por e-mail" — o download continua livre.
- Todo e-mail terá um rodapé automático de "cancelar inscrição", que não pode ser removido.
- Não é possível anexar arquivos; PDFs e drivers vão como link.
- "Pedido entregue" depende da informação de entrega vir do Melhor Envio; se não vier, o admin marca como entregue manualmente e o e-mail sai.

## Detalhes técnicos
- Domínio via diálogo de setup; depois setup_email_infra + scaffold_transactional_email (rotas /lovable/email/*, fila, supressão, página de descadastro branded).
- Templates React Email em src/lib/email-templates/, visual Adeconex (vermelho #e63946, fundo branco), cada um lendo textos editáveis.
- Nova tabela email_template_settings (key, enabled, subject, blocks jsonb, updated_by) com RLS staff; seção "emails" em STAFF_SECTIONS; rota _authenticated.admin.emails.tsx.
- Gatilhos no servidor: cadastro (boas-vindas), createOrder (recebido/primeiro pedido), applyMercadoPagoPayment (confirmado/recusado), mudança de status no admin (produção/enviado/entregue/cancelado), contato.tsx, newsletter e downloads via rotas de ação próprias; idempotência por evento+modelo.
- Tabela newsletter_subscribers (email, consentimento, origem) com insert por rota pública validada.
- Templates de autenticação (confirmação, senha) re-estilizados com scaffold_auth_email_templates.
