/** Constantes da ferramenta de código de barras, sem dependência de UI (usadas no head/loader das rotas). */
import { absoluteUrl } from "@/lib/seo";

export const TOOL_PATH = "/ferramentas/gerador-de-codigo-de-barras";
export const TOOL_URL = absoluteUrl(TOOL_PATH);

export const BARCODE_FAQ: { q: string; a: string }[] = [
  { q: "O gerador de código de barras é gratuito?", a: "Sim. A ferramenta é gratuita, não exige cadastro, login nem e-mail para baixar os arquivos." },
  { q: "Posso usar esses códigos para vender no varejo?", a: "Para vender em supermercados e grandes redes você precisa de um prefixo de empresa licenciado pela GS1 Brasil (789/790). Códigos gerados aqui para uso interno, estoque e logística não precisam de licença." },
  { q: "Meus dados são enviados para algum servidor?", a: "Não. Toda a geração acontece no seu navegador. Nenhum número de produto, lote ou série sai do seu computador." },
  { q: "Qual formato devo pedir para a gráfica?", a: "SVG. É vetorial, com as barras em paths, e abre no Illustrator e no CorelDRAW sem perda de qualidade em nenhuma ampliação." },
  { q: "Qual DPI usar na impressora térmica?", a: "203 dpi atende etiquetas simples; 300 dpi é o padrão para códigos pequenos e textos finos; 600 dpi é indicado para códigos 2D muito reduzidos, como GS1 DataMatrix em medicamentos." },
  { q: "Como calculo o dígito verificador?", a: "O cálculo é automático. Digite 12 dígitos no EAN-13 (ou 7 no EAN-8) e o verificador é somado pelo módulo 10 da GS1. Também validamos o dígito quando você cola o número completo." },
  { q: "Dá para gerar várias etiquetas de uma vez?", a: "Sim. No PDF em folha A4 você escolhe um preset de folha ou define a grade em milímetros, e pode repetir o mesmo código ou gerar uma sequência incremental com verificador recalculado." },
  { q: "Por que o código impresso não é lido?", a: "Na maioria dos casos é quiet zone insuficiente, contraste ruim, impressão abaixo de 203 dpi, ampliação abaixo do mínimo da GS1 ou papel inadequado para o tipo de impressão." },
  { q: "O que é ITF-14 e quando usar?", a: "É o código da caixa máster. Você o gera a partir do EAN-13 do produto somando o indicador de agrupamento (1 a 8). Em papelão ondulado, use bearer bar." },
  { q: "Qual a diferença entre GS1-128 e Code 128?", a: "Code 128 é a simbologia pura, para uso livre. GS1-128 usa a mesma simbologia com regras GS1: FNC1, Application Identifiers e separadores GS, permitindo transmitir lote, validade e quantidade em um único código." },
];
