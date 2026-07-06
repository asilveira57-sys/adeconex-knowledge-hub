/**
 * Sanitiza o campo `technical_description` (HTML legado importado da loja
 * antiga). Em produtos NÃO adesivos a ficha técnica original vinha com as
 * tabelas de "Adesivo" e "Liner" — que só fazem sentido para etiquetas
 * autoadesivas. Removemos esses blocos para não confundir o cliente.
 */

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
