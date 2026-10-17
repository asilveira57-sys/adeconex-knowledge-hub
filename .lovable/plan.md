# Calculadora de Ribbon — versão completa

## 1. Altura com troca de unidade inteligente
- Ao trocar mm para cm, o número é convertido na hora: 50 mm vira 5 cm (e 5 cm volta a 50 mm). Nunca vira "50 cm".
- Aviso suave se a altura passar de 200 mm (20 cm): "Etiqueta incomum — confira a unidade".

## 2. Novo campo: Colunas
- Padrão 1. Metragem final = (altura + 3 mm) x quantidade ÷ colunas.
- Ex.: 1.000 etiquetas de 50 mm em 2 colunas = 26,5 m.
- Campo opcional "Largura da etiqueta" (só para conferência, não entra na metragem). Com ele, o sistema soma colunas x largura + espaços e avisa se passar de 104 mm de área útil (impressoras de 4" / 109 mm de boca).
- Sem largura informada, aparece a observação: "A maioria das impressoras tem 109 mm de boca — confirme que as colunas cabem."
- Acima de 4 colunas, alerta em destaque.

## 3. Rendimento por rolo de ribbon (no lugar de "1 rolo")
Para cada rolo (74, 90, 300, 450 m):
- Quantas tiragens iguais a essa ele imprime (ex.: 74 m ÷ 26,5 m = 2,79 tiragens).
- Quantas etiquetas cabem em um rolo inteiro de ribbon.
- Quanto sobra em metros depois desta tiragem (ex.: sobram 47,5 m) — ou quantos rolos faltam, se não couber.
- Campo opcional "Etiquetas por rolo de etiqueta" (ex.: 1.000): mostra "este ribbon imprime 2 rolos de etiqueta e sobram X m".
- Texto: "Consumo estimado, sem contar desperdício de calibração e emendas." Margem de segurança opcional (0%, 5%, 10%).

## 4. Modelos prontos
Botões com os tamanhos mais vendidos que preenchem altura, largura e colunas:
- 100x150 (envio), 100x50, 100x100, 50x30 2 colunas, 40x25 2 colunas, 33x22 3 colunas, 30x15 3 colunas, 60x40.
- A lista fica num arquivo único, fácil de editar; posso ajustar aos seus tamanhos reais.

## 5. Futuro (não entra agora)
- Ligar aos produtos do catálogo que já têm altura/largura: na página da etiqueta, mostrar "1 rolo de ribbon de 74 m imprime N rolos desta etiqueta".
- Para isso a lógica do cálculo fica separada da página, pronta para ser reaproveitada.

## Detalhes técnicos
- Criar `src/lib/ribbon-calculator.ts` (função pura: passo, metragem, rendimento por rolo, checagem de largura) + presets; testes Vitest com os valores citados (50 mm, 1.000, 2 colunas = 26,5 m; sobra em 74 m = 47,5 m).
- Reescrever `src/routes/ferramentas.calculadora-de-ribbon.tsx` usando essa lib; atualizar descrição SEO para mencionar colunas e rendimento.
