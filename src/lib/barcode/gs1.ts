/**
 * Construtor de Application Identifiers (GS1) usado por GS1-128 e GS1 DataMatrix.
 * A string é montada no formato com parênteses, que o bwip-js converte em
 * FNC1 + separadores GS automaticamente (parsefnc / GS1 encoder).
 */

export interface AiDef {
  ai: string;
  label: string;
  /** comprimento fixo do dado (undefined = variável) */
  fixed?: number;
  maxLen: number;
  numeric: boolean;
  hint: string;
  /** data no formato AAMMDD */
  date?: boolean;
  /** AI com casa decimal (310n) */
  decimal?: boolean;
}

export const AI_DEFS: AiDef[] = [
  { ai: "00", label: "SSCC (unidade logística)", fixed: 18, maxLen: 18, numeric: true, hint: "18 dígitos com verificador" },
  { ai: "01", label: "GTIN", fixed: 14, maxLen: 14, numeric: true, hint: "14 dígitos (EAN-13 com zero à esquerda)" },
  { ai: "02", label: "GTIN dos itens contidos", fixed: 14, maxLen: 14, numeric: true, hint: "14 dígitos" },
  { ai: "10", label: "Lote", maxLen: 20, numeric: false, hint: "até 20 caracteres" },
  { ai: "11", label: "Data de fabricação", fixed: 6, maxLen: 6, numeric: true, date: true, hint: "AAMMDD" },
  { ai: "15", label: "Validade mínima (best before)", fixed: 6, maxLen: 6, numeric: true, date: true, hint: "AAMMDD" },
  { ai: "17", label: "Data de validade", fixed: 6, maxLen: 6, numeric: true, date: true, hint: "AAMMDD" },
  { ai: "20", label: "Variante do produto", fixed: 2, maxLen: 2, numeric: true, hint: "2 dígitos" },
  { ai: "21", label: "Número de série", maxLen: 20, numeric: false, hint: "até 20 caracteres" },
  { ai: "30", label: "Quantidade", maxLen: 8, numeric: true, hint: "até 8 dígitos" },
  { ai: "37", label: "Contagem de itens", maxLen: 8, numeric: true, hint: "até 8 dígitos" },
  { ai: "3103", label: "Peso líquido (kg, 3 decimais)", fixed: 6, maxLen: 6, numeric: true, decimal: true, hint: "6 dígitos — 000123 = 0,123 kg" },
  { ai: "3102", label: "Peso líquido (kg, 2 decimais)", fixed: 6, maxLen: 6, numeric: true, decimal: true, hint: "6 dígitos — 001230 = 12,30 kg" },
  { ai: "410", label: "GLN entrega (410)", fixed: 13, maxLen: 13, numeric: true, hint: "13 dígitos" },
  { ai: "411", label: "GLN faturado (411)", fixed: 13, maxLen: 13, numeric: true, hint: "13 dígitos" },
  { ai: "412", label: "GLN comprador (412)", fixed: 13, maxLen: 13, numeric: true, hint: "13 dígitos" },
  { ai: "413", label: "GLN destino final (413)", fixed: 13, maxLen: 13, numeric: true, hint: "13 dígitos" },
  { ai: "414", label: "GLN do local físico (414)", fixed: 13, maxLen: 13, numeric: true, hint: "13 dígitos" },
];

export const AI_BY_CODE = Object.fromEntries(AI_DEFS.map((a) => [a.ai, a])) as Record<string, AiDef>;

export interface AiEntry {
  id: string;
  ai: string;
  value: string;
}

export function validateAiEntry(entry: AiEntry): string | null {
  const def = AI_BY_CODE[entry.ai];
  if (!def) return "Application Identifier desconhecido.";
  const v = entry.value.trim();
  if (!v) return `Informe o valor do AI (${entry.ai}).`;
  if (def.numeric && !/^\d+$/.test(v)) return `O AI (${entry.ai}) aceita somente dígitos.`;
  if (def.fixed && v.length !== def.fixed) {
    return `O AI (${entry.ai}) tem tamanho fixo de ${def.fixed} caracteres — você digitou ${v.length}.`;
  }
  if (!def.fixed && v.length > def.maxLen) {
    return `O AI (${entry.ai}) aceita no máximo ${def.maxLen} caracteres.`;
  }
  if (def.date) {
    const mm = Number(v.slice(2, 4));
    const dd = Number(v.slice(4, 6));
    if (mm < 1 || mm > 12) return `Mês inválido no AI (${entry.ai}). Use o formato AAMMDD.`;
    if (dd > 31) return `Dia inválido no AI (${entry.ai}). Use o formato AAMMDD.`;
  }
  return null;
}

/** Monta a string GS1 no formato "(01)…(10)…" aceito pelo bwip-js. */
export function buildGs1String(entries: AiEntry[]): string {
  return entries
    .filter((e) => e.value.trim())
    .map((e) => `(${e.ai})${e.value.trim()}`)
    .join("");
}

/** Texto legível (HRI) formatado com os AIs entre parênteses. */
export function humanReadableGs1(entries: AiEntry[]): string {
  return entries
    .filter((e) => e.value.trim())
    .map((e) => `(${e.ai}) ${e.value.trim()}`)
    .join("  ");
}
