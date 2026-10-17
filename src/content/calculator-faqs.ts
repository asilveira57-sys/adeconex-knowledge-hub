import type { FaqItem } from "@/components/tools/tool-faq";

const COMMON: FaqItem[] = [
  {
    q: "Devo informar a altura em milímetros ou centímetros?",
    a: "Tanto faz. Escolha a unidade antes de digitar. Ao trocar de unidade, o valor é convertido sozinho: 50 mm vira 5 cm. A altura é a medida no sentido em que o rolo avança na impressora, não a largura.",
  },
  {
    q: "Por que o cálculo soma 3 mm na altura?",
    a: "Entre uma etiqueta e outra existe um espaço (gap) no papel de proteção, normalmente de 3 mm. Esse espaço também passa pela impressora, então cada etiqueta ocupa a altura dela mais 3 mm. Uma etiqueta de 50 mm ocupa 53 mm do rolo.",
  },
  {
    q: "Como as colunas mudam o resultado?",
    a: "Em rolos com 2 ou 3 colunas, várias etiquetas saem lado a lado no mesmo avanço. Por isso a metragem é dividida pelo número de colunas: 1.000 etiquetas de 50 mm em 2 colunas usam 26,5 m em vez de 53 m.",
  },
  {
    q: "Para que serve a largura, se ela não entra na metragem?",
    a: "A largura serve para conferir se as colunas cabem na impressora. A conta soma as etiquetas, 3 mm entre colunas e 1,5 mm em cada borda e compara com os 109 mm de boca das impressoras de 4 polegadas. Exemplo: 3 colunas de 33 mm ocupam 108 mm e cabem.",
  },
];

export const RIBBON_FAQ: FaqItem[] = [
  ...COMMON,
  {
    q: "Como os resultados são arredondados?",
    a: "A metragem aparece com duas casas decimais. O número de rolos de ribbon necessários é sempre arredondado para cima, para não faltar ribbon no meio da tiragem. A quantidade de etiquetas que um rolo imprime é arredondada para baixo, contando só etiquetas inteiras.",
  },
  {
    q: "O consumo calculado inclui desperdício?",
    a: "Não. É o consumo da impressão em si, sem calibração, testes e emendas. Use a margem de segurança de 5% ou 10% para ter uma folga.",
  },
  {
    q: "Qual rolo de ribbon escolher?",
    a: "Para impressoras de mesa de 4 polegadas, o mais comum é o ribbon de 110 mm × 74 m. Rolos de 300 m e 450 m são para impressoras industriais.",
  },
];

export const LABEL_ROLL_FAQ: FaqItem[] = [
  ...COMMON,
  {
    q: "Como os resultados são arredondados?",
    a: "Na conta de etiquetas por rolo, contamos só as linhas inteiras que cabem nos metros informados (arredondado para baixo) e multiplicamos pelas colunas. Na conta de metragem, a última linha incompleta é contada inteira, porque ela também avança no rolo.",
  },
  {
    q: "Por que o rolo real pode ter um pouco mais ou menos etiquetas?",
    a: "O resultado é uma estimativa. O início do rolo, a ponta presa ao tubete e pequenas variações no espaçamento de cada fabricante mudam um pouco o número final.",
  },
  {
    q: "Posso mudar o espaçamento entre etiquetas?",
    a: "Sim. O padrão é 3 mm, mas alguns rolos usam 2 mm ou 4 mm. Meça a distância entre o fim de uma etiqueta e o começo da próxima e digite no campo Espaçamento.",
  },
];
