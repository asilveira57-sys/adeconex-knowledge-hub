# Avaliações de produtos (estilo Trustvox / Opiniões Verificadas, sem mensalidade)

## O que o cliente vê

**Na página do produto**
- Resumo no topo, perto do preço: estrelas (com meias estrelas), nota média (ex.: 4,5) e "32 avaliações". Ao clicar, a página rola até as avaliações.
- Seção "Avaliações de clientes":
  - Barras com quantas notas de 5, 4, 3, 2 e 1 estrelas.
  - Galeria com as fotos e os vídeos enviados pelos clientes.
  - Filtros: só com foto/vídeo, só compra verificada e por nota. Ordenação: mais recentes, mais úteis, maior e menor nota.
  - Cada avaliação mostra nome abreviado ("Maria S."), cidade/UF opcional, data, o selo **"Compra verificada"**, título, texto, fotos/vídeos e o botão "Foi útil? (12)".
  - Quando houver, a **resposta da Adeconex** aparece logo abaixo da avaliação.
  - Botões de compartilhar o produto e a avaliação: WhatsApp, Facebook, X, copiar link, e o compartilhar nativo do celular.

**Escrever uma avaliação**
- O cliente escolhe a nota de 0,5 a 5, em meias estrelas (toque ou teclado), e escreve título e texto (mínimo de 20 caracteres).
- Pode enviar até 5 fotos e 1 vídeo curto (até 60 s / 50 MB).
- Precisa marcar a concordância com as regras de publicação.
- Precisa estar logado. Quem comprou o produto ganha o selo "Compra verificada"; quem não comprou pode avaliar, mas sem o selo.
- Cada pessoa faz uma avaliação por produto e pode editá-la depois.

**Por e-mail, depois da compra**
- 7 dias depois de o pedido ser marcado como **entregue**, o cliente recebe o e-mail "Como foi sua experiência?". Ele traz cada produto do pedido com 5 estrelas clicáveis.
- O clique abre a página de avaliação já com a nota escolhida e o produto certo. O link é seguro: entra sem pedir senha, vale só para aquele pedido e expira em 60 dias.
- Se o cliente não avaliar, recebe um único lembrete 7 dias depois. O texto dos dois e-mails pode ser editado no menu E-mails, como os outros.

## Moderação (admin → novo menu "Avaliações")
- Toda avaliação nova fica **pendente** até alguém aprovar. Antes de aprovar, um filtro automático marca palavrões, links, telefones e e-mails.
- Ações:
  - Aprovar, recusar (com motivo) ou ocultar.
  - Responder publicamente.
  - Marcar como destaque.
  - Remover uma foto ou vídeo inadequado.
- Painel com:
  - Nota média geral e nota por produto.
  - Taxa de resposta aos e-mails.
  - Avaliações pendentes.
  - Produtos sem nenhuma avaliação.
- Avisos para a equipe: nova avaliação pendente e nota de 2 ou menos.
- Avaliações negativas **não podem ser escondidas só por serem negativas**. Isso é regra do Google e do Código de Defesa do Consumidor; só se recusa conteúdo ofensivo ou fora do tema.

## Google e assistentes de IA (ChatGPT, Gemini, Claude)
- A página de cada produto ganha dados para o Google mostrar as estrelas na busca: nota média, número de avaliações e até 10 avaliações completas. O Google permite estrelas em páginas de produto da própria loja.
- As avaliações vêm escritas na própria página, e não carregadas depois, para que Google e IAs consigam ler.
- Cada produto ganha um resumo em texto simples, por exemplo: "Nota 4,6 de 5 com base em 32 avaliações verificadas. Clientes destacam: boa aderência, impressão nítida…". Os pontos destacados são gerados a partir das avaliações aprovadas e atualizados automaticamente. É o tipo de trecho que assistentes de IA costumam citar.
- Nova página pública **/avaliacoes-de-produtos**, com as avaliações mais recentes de toda a loja e link para cada produto. Ela entra no sitemap e no arquivo que orienta robôs de IA, se existir.
- O catálogo e as vitrines passam a mostrar as estrelas pequenas e o número de avaliações em cada produto.
- No Google Analytics passam a ser contados: avaliação enviada, clique nas estrelas do e-mail e compartilhamento.

## Regras que ficam valendo
- Notas de 0,5 a 5, em meias estrelas.
- Uma avaliação por cliente por produto.
- Primeiro e-mail 7 dias após a entrega, um lembrete 7 dias depois, e nada mais.
- Só aparecem no site e no Google as avaliações aprovadas.

## Detalhes técnicos

**Banco**
- `product_reviews`:
  - Campos: product_id, user_id, order_id (nulo se não comprou), rating numeric(2,1) com validação 0,5–5 em passos de 0,5, título, corpo, nome de exibição, cidade/UF, status (pending/approved/rejected/hidden), moderation_flags, admin_reply, replied_at, helpful_count, featured, verified_purchase, created_at, updated_at.
  - Unique (product_id, user_id).
- `product_review_media`: review_id, tipo (image/video), storage_path, ordem.
- `product_review_votes`: review_id, voter_key (usuário ou visitante anônimo), unique.
- `review_requests`: order_id, user_id, token (hash), sent_at, reminder_sent_at, completed_at, expires_at.
- RLS:
  - Público lê só avaliações aprovadas e suas mídias.
  - O dono lê e edita a própria avaliação, inclusive pendente; ao editar, volta para pendente.
  - A equipe modera tudo via `is_staff`.
  - Nova permissão de área "avaliacoes" em Colaboradores.
- Cache de nota média e contagem por produto: colunas `rating_avg` e `rating_count` em `products`, atualizadas por trigger quando muda o status de uma avaliação. Assim catálogo e JSON-LD não precisam de consultas pesadas.
- Bucket de storage `review-media`: público para leitura e upload só pelo próprio usuário na pasta dele, com validação de tipo e tamanho.

**Servidor**
- `submitReview`:
  - Autenticado ou com token do e-mail.
  - Verifica compra verificada pelo pedido pago/entregue que contém o produto.
  - Valida e aplica o filtro de moderação.
- `getProductReviews`: público, SSR, paginado, com filtros e agregados.
- `voteHelpful`.
- Funções de moderação para a equipe.
- Os textos de "o que clientes destacam" são gerados pelo Lovable AI a partir das avaliações aprovadas e guardados por produto. Só são refeitos quando há avaliações novas.
- **Envio agendado do e-mail:** este projeto ainda não tem o agendador automático de chamadas.
  - Plano: uma rotina "envia avaliações vencidas", com trava para rodar no máximo 1 vez por hora, disparada pelas próprias visitas do site e pela abertura do admin.
  - Ela seleciona pedidos com `delivered_at` há mais de 7 dias sem pedido de avaliação enviado, e lembretes vencidos.
  - Envia pelo `sendAppEmail` com chave de idempotência por pedido, então nada é enviado em duplicidade.
  - Se o agendador gerenciado ficar disponível, a mesma rotina passa a ser chamada por ele.
- Novos modelos de e-mail: "avaliacao-pedido" e "avaliacao-lembrete". As 5 estrelas viram links com `?nota=`.
- Rotas novas:
  - `/avaliar/$token`: avaliação a partir do e-mail, com noindex.
  - `/avaliacoes-de-produtos`: página pública.
  - `/admin/avaliacoes`: moderação.

**Página do produto**
- Componente `StarRating`, com SVG de meia estrela, rótulos acessíveis e seleção em passos de 0,5.
- `ReviewSummary`, `ReviewList`, `ReviewForm`, `MediaLightbox` e `ShareButtons`.
- O JSON-LD Product existente recebe `aggregateRating` (somente com 1 ou mais avaliações aprovadas) e `review[]` com `author`, `datePublished`, `reviewRating` e `reviewBody`.

**Testes:**
- Validação da nota: aceita só 0,5–5 em passos de 0,5.
- Cálculo da média e da distribuição.
- Regra de envio: 7 dias após a entrega e no máximo 1 lembrete.
- Expiração do token.
- Moderação marcando links e telefones.

## Fora deste plano (podemos fazer depois)
- Perguntas e respostas sobre o produto.
- Importar avaliações do Mercado Livre/Shopee.
- Selo de loja verificada no rodapé com nota geral.
