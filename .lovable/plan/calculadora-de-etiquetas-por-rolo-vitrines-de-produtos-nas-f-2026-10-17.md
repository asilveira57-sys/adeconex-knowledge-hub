# Calculadora de etiquetas por rolo + vitrines de produtos nas ferramentas e no blog

## 1. Nova ferramenta: Calculadora de Etiquetas por Rolo
Página nova em Ferramentas, com dois modos:
- **Sei a quantidade → quero os metros:** altura da etiqueta (mm ou cm, com troca automática 50 mm = 5 cm), espaçamento (padrão 3 mm, editável), colunas (padrão 1), largura opcional e quantidade. Resultado: metragem do rolo. Ex.: 1.000 etiquetas de 50 mm, 1 coluna = 53 m.
- **Sei os metros → quero a quantidade:** altura, espaçamento, colunas e metros do rolo. Resultado: quantas etiquetas cabem. Ex.: 50 m, 50 mm, 1 coluna = 943 etiquetas.
- Mesmos modelos prontos e a mesma conferência de largura (109 mm de boca) da calculadora de ribbon.
- Link em destaque: "Calcule também o consumo de ribbon desta tiragem", levando para a calculadora de ribbon já com as medidas preenchidas. A calculadora de ribbon ganha o link de volta.
- Título, descrição e dados para o Google próprios; entra no menu Ferramentas e no mapa do site.

## 2. Vitrine de produtos em todas as ferramentas
Embaixo de cada ferramenta, uma vitrine em grade (4 colunas × 2 linhas = 8 produtos no computador; 2 colunas no celular), com botão "Ver todos".
- **Calculadora de ribbon:** ribbons, com o 110 × 74 sempre primeiro.
- **Etiquetas por rolo, planejadores de bobina e folha, conversor, gerador de código de barras, ZPL e QR Code:** etiquetas mais vendidas.
- "Mais vendidas" = produtos com mais unidades vendidas em pedidos pagos; se houver menos de 8, completa com os mais recentes da categoria.
- Cada vitrine registra visualização e clique no Google Analytics.

## 3. Vitrine também nos posts do blog
Ao final de cada post, a mesma vitrine. Escolha automática pelo tema do post (ribbon → ribbons; demais → etiquetas mais vendidas).

## 4. Regra para o futuro
Fica registrado no projeto: toda ferramenta e todo post novo do blog termina com uma vitrine de produtos.

## Detalhes técnicos
- `src/lib/label-roll-calculator.ts` (funções puras, reutilizando `ribbon-calculator`), com testes Vitest para 53 m e 943 etiquetas.
- Rota `src/routes/ferramentas.calculadora-de-etiquetas-por-rolo.tsx`; parâmetros de busca (altura, colunas, quantidade) aceitos pela calculadora de ribbon para pré-preencher.
- Novo server fn `getToolShowcase({ kind: "ribbon" | "labels", pinSlugPattern?, limit })`: ranking por `order_items` de pedidos pagos, fallback para categoria; ribbon fixa no topo produtos cujo nome contém "110" e "74".
- Componente `ProductShowcaseGrid` (grade, reaproveita o card da vitrine atual), carregado via loader + `useSuspenseQuery`.
- Regra registrada em `AGENTS.md` e memória do projeto.
