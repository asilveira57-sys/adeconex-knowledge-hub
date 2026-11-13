/**
 * Nome de exibição de categoria. O cadastro importado veio em CAIXA ALTA
 * ("ETIQUETA DE VESTUARIO"); para títulos e H1 convertemos para "Etiqueta de Vestuário"-like
 * sem mexer no dado salvo. Nomes já com caixa mista são respeitados.
 */
const LOWER = new Set(["de", "da", "do", "das", "dos", "e", "para", "p/", "com", "sem", "em", "a", "o"]);
const KEEP_UPPER = new Set(["BOPP", "MDF", "ZPL", "PDV", "GG", "PP", "EAN", "QR", "USB", "L42", "OS", "PRO"]);
const FIXES: Record<string, string> = {
  vestuario: "vestuário",
  otica: "ótica",
  informatica: "informática",
};

export function displayCategoryName(name: string): string {
  const raw = name.trim().replace(/\s+/g, " ");
  // Só converte nomes inteiramente em caixa alta (ignorando medidas como "48x100M").
  if (raw.split(" ").some((w) => !/\d/.test(w) && w !== w.toUpperCase())) return raw;
  return raw
    .split(" ")
    .map((word, i) => {
      if (KEEP_UPPER.has(word) || /\d/.test(word)) return word;
      let w = word.toLocaleLowerCase("pt-BR");
      w = FIXES[w] ?? w;
      if (i > 0 && LOWER.has(w)) return w;
      return w.charAt(0).toLocaleUpperCase("pt-BR") + w.slice(1);
    })
    .join(" ");
}
