/**
 * Sanitiza o campo `technical_description` (HTML legado importado da loja
 * antiga). Em produtos NÃO adesivos a ficha técnica original vinha com as
 * tabelas de "Adesivo" e "Liner" — que só fazem sentido para etiquetas
 * autoadesivas. Removemos esses blocos para não confundir o cliente.
 *
 * Também exportamos a ficha técnica do papel base (Couchê Suzano Design
 * Gloss 150 g/m² — laudo do fabricante) usada nas etiquetas TAG e Gôndola
 * NÃO ADESIVAS (papel cartão sem cola).
 */

/**
 * Ficha técnica do papel couchê (base) — 150 g/m², Suzano Design Gloss.
 * Fonte: laudo Suzano EP.01.00217. Aplicável a produtos NÃO adesivos
 * (TAG e Gôndola sem cola / papel cartão 150 g).
 */
export const NON_ADHESIVE_PAPER_150_SPECS_HTML = `
<div class="paper-spec">
  <h3><strong>Ficha técnica do papel — Couchê 150 g/m² (não adesivo)</strong></h3>
  <p>Papel couchê brilhante revestido em ambos os lados (Suzano Design Gloss), utilizado como base das etiquetas TAG e Gôndola <strong>não adesivas</strong> (papel cartão sem cola). Especificações conforme laudo do fabricante (norma de referência entre parênteses):</p>
  <table>
    <thead>
      <tr><th>Propriedade</th><th>Unidade</th><th>Valor nominal</th><th>Tolerância</th></tr>
    </thead>
    <tbody>
      <tr><td>Gramatura (ISO 536)</td><td>g/m²</td><td>150</td><td>±5,8</td></tr>
      <tr><td>Espessura (ISO 534)</td><td>µm</td><td>131</td><td>±6</td></tr>
      <tr><td>Umidade (TAPPI 412)</td><td>%</td><td>4,5</td><td>±1,0</td></tr>
      <tr><td>Brilho 75° (ISO 8254)</td><td>%</td><td>68</td><td>mín. 64</td></tr>
      <tr><td>Opacidade (ISO 2471)</td><td>%</td><td>98</td><td>mín. 96</td></tr>
      <tr><td>Alvura ISO C/2° (ISO 2470)</td><td>%</td><td>91</td><td>mín. 88</td></tr>
    </tbody>
  </table>
  <p><em>Condições de ensaio: 23 °C / 50 % UR (ISO 187). Tolerâncias baseadas em 95 % de intervalo de confiança sobre a média do pallet/bobina. Certificações do fabricante: ISO 9001, ISO 14001, OHSAS 18001, FSC.</em></p>
</div>
`.trim();



function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** true se o nome/sku indica produto sem adesivo (tag, cartão, não adesiva). */
export function isNonAdhesiveProduct(input: {
  name?: string | null;
  sku?: string | null;
  adhesive_type?: string | null;
}): boolean {
  const hay = normalize(`${input.name ?? ""} ${input.sku ?? ""}`);
  if (/\bnao adesiv/.test(hay)) return true;
  if (/\bsem adesivo\b/.test(hay)) return true;
  if (/\btag\b/.test(hay) && !/adesiv/.test(hay)) return true;
  return false;
}

/**
 * Remove tabelas cuja legenda/cabeçalho menciona "Adesivo" ou "Liner" e
 * parágrafos soltos com métricas exclusivas de adesivo. Mantém a estrutura
 * do restante do HTML.
 */
export function sanitizeTechnicalDescription(
  html: string | null | undefined,
  opts: { isAdhesive: boolean },
): string {
  if (!html) return "";
  if (opts.isAdhesive) return html;

  let out = html;

  // Remove <table>...</table> cujo conteúdo textual mencione palavras-chave
  // exclusivas de material adesivo.
  out = out.replace(/<table[\s\S]*?<\/table>/gi, (block) => {
    const txt = normalize(block.replace(/<[^>]+>/g, " "));
    if (
      /\badesivo\b/.test(txt) ||
      /\bliner\b/.test(txt) ||
      /\btack\b/.test(txt) ||
      /\bcoesao\b/.test(txt) ||
      /temperatura de (aplicacao|servico)/.test(txt)
    ) {
      return "";
    }
    return block;
  });

  // Remove parágrafos avulsos com métricas de adesivo/liner
  out = out.replace(/<p[^>]*>[\s\S]*?<\/p>/gi, (p) => {
    const txt = normalize(p.replace(/<[^>]+>/g, " "));
    if (/gramatura total|espessura total/.test(txt)) return "";
    if (/^\s*(adesivo|liner)\s*$/.test(txt)) return "";
    return p;
  });

  // Compacta múltiplos separadores/espaços vazios
  out = out.replace(/(<hr\s*\/?>\s*){2,}/gi, "<hr/>");
  out = out.replace(/(<p[^>]*>\s*<\/p>\s*){2,}/gi, "");

  return out;
}
