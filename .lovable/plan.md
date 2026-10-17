# Compartilhar pesquisa do catálogo (PDF + e-mail + WhatsApp) com captura de lead

## Como funciona para o visitante
1. No catálogo, depois de filtrar e buscar, aparece o botão **"Salvar / compartilhar esta pesquisa"** ao lado da ordenação.
2. Abre uma janela pedindo **nome, e-mail e WhatsApp** (os três obrigatórios), mais a caixa obrigatória de aceite: "Aceito receber esta lista e contato da Adeconex". Não precisa ter login. Se a pessoa já estiver logada, os campos vêm preenchidos.
3. Ao confirmar, a pesquisa é salva e a pessoa escolhe entre:
   - **Baixar PDF**: o PDF sai na hora, com a logomarca, os dados da empresa, os filtros usados, a data e até 60 produtos (foto, nome, SKU, preço, link). No rodapé vão o WhatsApp e o e-mail de vendas.
   - **Receber por e-mail**: chega um e-mail com o botão "Abrir minha lista" e o link do PDF. O sistema de e-mail não aceita anexo, então o PDF vai como link.
   - **Enviar pelo WhatsApp**: abre o WhatsApp da pessoa com uma mensagem pronta e o link da lista. Ela escolhe para quem mandar, inclusive para si mesma.
4. O link da lista abre uma página pública da pesquisa salva (`/catalogo/lista/<código>`), sem indexação no Google. A página tem os produtos com preço atualizado e os botões "Baixar PDF" e "Falar com vendas".

## No admin
- Novo menu **Leads do catálogo**: nome, e-mail, WhatsApp, data, filtros pesquisados, quantidade de produtos e canal escolhido (PDF, e-mail ou WhatsApp).
- Cada lead tem um botão para chamar a pessoa no WhatsApp e um botão para abrir a lista dela.
- Exportação em CSV, respeitando a permissão de exportação dos colaboradores.
- Novo e-mail editável no menu E-mails: "Sua lista do catálogo".

## Limite importante
Para o WhatsApp enviar a mensagem **automaticamente** a partir do número da Adeconex, seria preciso conectar o WhatsApp Business oficial (aprovação da Meta e modelos de mensagem). Este plano usa o envio pelo próprio WhatsApp da pessoa, que funciona já e não tem custo. A conexão oficial pode vir depois.

## Detalhes técnicos
- Nova tabela `catalog_leads`: id, token público aleatório, nome, e-mail, telefone, consentimento, `search_params` jsonb, `product_ids` em snapshot, canal, user_id opcional e created_at. RLS: leitura e escrita só para a equipe. A inserção pública passa por um server fn validado com zod, com limite de tamanho e honeypot anti-spam.
- A leitura pública por token passa por um server fn que retorna só os produtos e os filtros, nunca os dados pessoais do lead.
- O PDF é gerado no navegador com jsPDF, reaproveitando o padrão do PDF de pedidos. A rota `/catalogo/lista/$token` também gera o PDF, então o link do e-mail funciona.
- O e-mail usa `sendAppEmail` com o novo template `catalog-list` e o idempotencyKey `catalog-list-<leadId>`.
- WhatsApp: `https://wa.me/?text=` com encodeURIComponent.
- Evento de analytics `share_search` com o canal.
- Testes de validação do lead (campos obrigatórios e consentimento) e da regra de que o token não expõe os dados pessoais.
