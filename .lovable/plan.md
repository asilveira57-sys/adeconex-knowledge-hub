# Editor de etiqueta abrindo já configurado pelo produto

## O problema (verificado)

Ao clicar em "Personalizar esta etiqueta", o link já leva o slug do produto para o editor
(`/etiquetas/editor?produto=...`). O editor tenta achar esse produto na lista de produtos
personalizáveis — mas essa lista volta **vazia**.

Motivo: a consulta que alimenta o editor usa o acesso público, e a regra de segurança do
catálogo só libera produtos com status "published". O produto redondo de 4 cm está com
status "enriched" (aparece no catálogo porque o catálogo usa outro caminho de leitura).
Sem a ficha, o editor cai no padrão genérico: 100 × 50 mm, retangular.

Confirmado no banco: `etiqueta-redonda-transparente-4cm-500-etiquetas-1-rolo` está com
`is_customizable = true`, formato `circle`, 40 × 40 mm, 1 coluna, 1 linha — dados corretos,
só não chegam ao editor.

## O que será feito

1. **Buscar a ficha do produto pelo caminho certo**
   A leitura dos produtos personalizáveis passa a usar o mesmo acesso do catálogo
   (status "enriched" ou "published", disponível), então o produto passa a aparecer.

2. **Carregar direto pelo slug**
   Nova consulta que busca a ficha de um único produto pelo slug/id vindo da URL, feita já
   no carregamento da página. Assim o editor abre com o produto certo mesmo que ele não
   esteja na lista geral, e sem "piscar" no formato genérico.

3. **Editor abre travado no produto**
   Ao entrar via "Personalizar", o editor já vem com:
   - formato (redonda, oval, quadrada, retangular, cantos arredondados)
   - largura e altura reais em mm
   - raio de canto
   - margem de segurança desenhada na área de arte
   - mockup do material (colunas, linhas, espaçamento entre colunas/linhas, margem) já visível
   - nome do modelo pré-preenchido com o nome do produto
   - campos de medida e formato bloqueados (vêm do produto), com a observação do cadastro

4. **Resumo visível da configuração**
   Um bloco no topo do editor mostrando: produto-base, formato, medidas, colunas × linhas e
   espaçamentos — para o usuário confirmar que está personalizando a etiqueta certa.

5. **Casos de erro claros**
   Se o slug não existir ou o produto não for personalizável, o editor mostra um aviso com
   link para o catálogo, em vez de abrir o editor genérico silenciosamente.

O editor continua funcionando em modo genérico quando acessado direto por
`/etiquetas/editor` sem produto.

## Detalhes técnicos

- `src/lib/labels.functions.ts`: trocar o cliente público por `supabaseAdmin` (import dinâmico
  dentro do handler) em `listCustomizableProducts`, com filtro `status in ('enriched','published')`
  e `is_available = true`; adicionar `getCustomizableProduct({ slug | id })` retornando
  `ProductLabelSpec | null`, reaproveitando `toSpec`.
- `src/routes/_authenticated.etiquetas.editor.tsx`: consultar o produto pelo parâmetro `produto`
  (react-query com `staleTime`), hidratar via `designFromSpec` assim que a ficha chegar,
  substituindo a lógica atual baseada na lista; manter a hidratação por `design` salvo.
- `src/components/labels/label-editor.tsx`: exibir o cartão-resumo da ficha quando houver `spec`,
  mostrar o mockup por padrão nesse caso e manter os campos de medida/formato desabilitados.
- Sem mudanças de schema; nenhuma alteração nas regras de RLS.
