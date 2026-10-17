# Comece por aqui — Assistente de soluções de impressão (Parte 1)

## O que o visitante verá
- Novo item **Comece por aqui** no menu principal.
- Página de entrada com o título "Encontre a solução de impressão ideal para o seu negócio", o texto introdutório e os cards das categorias (imagem, descrição curta, botão para começar).
- Página de cada jornada (`/comece-por-aqui/<slug>`): texto editorial, assistente passo a passo com barra de progresso, Voltar/Avançar, escolhas guardadas durante a visita e lista final agrupada (equipamento principal, suprimentos, acessórios, opcionais).
- Produtos da Adeconex usam a página, o preço e o estoque reais do catálogo. Nada é colocado no carrinho sem clique.
- Produtos externos e de afiliado têm botão próprio, `rel="sponsored nofollow"` e o aviso: "Link de afiliado: a Adeconex poderá receber uma comissão pela compra realizada por este link, sem custo adicional para você."
- Não aparece soma total quando há itens externos sem preço confirmado.
- Aviso de responsabilidade em todas as páginas do assistente.
- Leitores e softwares podem aparecer **somente** no assistente, nunca no catálogo.

## Painel admin — "Assistente de soluções"
- **Categorias:** nome, slug, descrições, capa, ícone, ordem, ativo, SEO.
- **Jornadas:** títulos, slug, categoria, textos de abertura e encerramento, capa, estado (rascunho / publicada / inativa), ordem, SEO (meta, H1, canônica, indexação), perguntas frequentes e botão **Duplicar** (cópia independente).
- **Etapas:** adicionar, renomear, duplicar, reordenar e remover. Os 8 tipos do documento, obrigatória ou opcional, mensagem de orientação, opções de escolha e uma condição simples do tipo "mostrar se a resposta da etapa X for Y".
- **Recomendações por etapa:** produto do catálogo (busca) **ou** item externo/afiliado (nome, fabricante, modelo, plataforma, URL original, URL de afiliado, data da verificação, estado do link, texto do botão). Também: função do item, motivo, obrigatório ou opcional, quantidade, ordem, observações e "aparece quando a opção escolhida for…".
- **Validação antes de publicar:** campos obrigatórios, pelo menos uma etapa, links válidos e produtos existentes.
- Permissão nova "Assistente" no cadastro de colaboradores.

## Cadastro inicial (tudo em rascunho, nada publicado)
- As 12 categorias do documento.
- 8 jornadas de exemplo (identificação, congelados, fita de cetim, expedição, transparentes, presentes, gráfica rápida, joalheria), com as etapas sugeridas no documento e **sem produtos nem modelos inventados**.

## SEO
- Somente jornadas publicadas e marcadas para indexar entram no sitemap. Rascunhos ficam com `noindex`.
- Dados estruturados apenas BreadcrumbList e FAQPage (com perguntas cadastradas). Nunca Product para a solução nem avaliações.

## Fica para a Parte 2
- Regras de compatibilidade técnicas (tecnologia, largura, material, tipo de ribbon…) e aviso automático quando faltar informação.
- Comparação lado a lado de produtos.
- Métricas (abertura, etapas, cliques internos, externos e de afiliado) e relatório com filtros.

## Detalhes técnicos
- Tabelas novas: `solution_categories`, `solution_journeys`, `solution_steps` (opções e condição em jsonb), `solution_recommendations` (product_id opcional ligado a products, ou campos externos/afiliado). RLS: leitura pública somente do que está publicado/ativo; escrita para staff (`is_staff`). GRANTs em todas.
- Leitura pública por server functions com o cliente público; escrita no admin por `requireSupabaseAuth` e checagem de staff.
- Rotas: `comece-por-aqui.index.tsx`, `comece-por-aqui.$slug.tsx`, `_authenticated.admin.assistente*.tsx`.
- As escolhas do visitante ficam em sessionStorage por jornada.
- Regra registrada no AGENTS.md.
