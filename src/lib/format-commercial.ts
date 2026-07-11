/**
 * Reformata visualmente o HTML de descrição comercial vindo da IA sem
 * alterar o conteúdo textual: quebra parágrafos muito longos em blocos
 * menores (padrão F de leitura) e aplica <strong> em termos-chave do
 * domínio (impressão térmica, ribbon, couché, etc.).
 *
 * Regras:
 *  - Só toca em texto que estiver DENTRO de <p>. Listas, tabelas e
 *    títulos são preservados como vieram.
 *  - Nunca insere HTML novo além de <p>, <strong>, <em>.
 *  - Idempotente: já rodou uma vez, roda de novo sem duplicar tags.
 */

const KEYWORDS: string[] = [
  // materiais
  "papel couché", "couché", "papel cartão", "BOPP", "kraft", "vinil",
  // adesivo / cola
  "adesivo acrílico", "adesivo permanente", "adesivo removível",
  "tack inicial", "tack", "coesão",
  // impressão
  "impressão térmica", "transferência térmica", "térmica direta",
  "ribbon", "ribbon cera", "ribbon resina", "ribbon misto",
  "código de barras", "QR code",
  // impressoras / marcas
  "Zebra", "Argox", "Elgin", "Datamax", "Honeywell", "TSC",
  // atributos
  "resistência", "durabilidade", "certificação FSC", "FSC",
  "gramatura", "espessura", "tubete",
  // aplicações
  "logística", "varejo", "identificação industrial", "identificação",
  "rastreabilidade", "automação",
];

// Escape para uso dentro de RegExp
function escRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Ordena por comprimento decrescente para casar termos maiores primeiro
const KW_RE = new RegExp(
  `\\b(${KEYWORDS.sort((a, b) => b.length - a.length).map(escRe).join("|")})\\b`,
  "gi",
);

/** Divide um parágrafo em blocos de ~2 sentenças cada, sem alterar palavras. */
function splitLongParagraph(inner: string, maxCharsPerBlock = 320): string[] {
  const plain = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= maxCharsPerBlock) return [inner.trim()];

  // Quebra em sentenças mantendo o delimitador
  const sentences = inner
    .split(/(?<=[.!?])\s+(?=[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9])/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sentences.length <= 1) return [inner.trim()];

  const blocks: string[] = [];
  let buf: string[] = [];
  let bufLen = 0;
  for (const s of sentences) {
    const sLen = s.replace(/<[^>]+>/g, "").length;
    if (bufLen + sLen > maxCharsPerBlock && buf.length > 0) {
      blocks.push(buf.join(" "));
      buf = [s];
      bufLen = sLen;
    } else {
      buf.push(s);
      bufLen += sLen;
    }
  }
  if (buf.length) blocks.push(buf.join(" "));
  return blocks;
}

/** Aplica <strong> em palavras-chave, sem quebrar tags já existentes. */
function boldKeywords(inner: string): string {
  // Divide preservando tags
  const parts = inner.split(/(<[^>]+>)/g);
  return parts
    .map((part) => {
      if (part.startsWith("<")) return part;
      return part.replace(KW_RE, (m) => `<strong>${m}</strong>`);
    })
    .join("");
}

export function formatCommercialHtml(html: string | null | undefined): string {
  if (!html) return "";
  let out = html;

  // Se veio como texto plano (sem tags), envolve em <p>
  if (!/<[a-z]/i.test(out)) {
    out = out
      .split(/\n{2,}/)
      .map((chunk) => `<p>${chunk.trim()}</p>`)
      .join("\n");
  }

  // Processa cada <p>: quebra se muito longo + negrito nas keywords.
  out = out.replace(/<p([^>]*)>([\s\S]*?)<\/p>/gi, (_m, attrs: string, inner: string) => {
    const blocks = splitLongParagraph(inner);
    return blocks.map((b) => `<p${attrs}>${boldKeywords(b)}</p>`).join("\n");
  });

  return out;
}
