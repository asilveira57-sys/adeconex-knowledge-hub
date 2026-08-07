/**
 * Definições das simbologias suportadas pelo Gerador de Código de Barras.
 * Toda a validação roda no navegador — nenhum dado é enviado ao servidor.
 */

export type SymbologyId =
  | "ean13"
  | "ean8"
  | "upca"
  | "itf14"
  | "gs1-128"
  | "sscc18"
  | "code128"
  | "code39"
  | "itf"
  | "codabar"
  | "msi"
  | "qrcode"
  | "gs1-datamatrix"
  | "pdf417";

export type SymbologyGroup = "varejo" | "logistica" | "industrial" | "2d";

export interface Symbology {
  id: SymbologyId;
  /** bcid usado pelo bwip-js */
  bcid: string;
  label: string;
  group: SymbologyGroup;
  slug: string | null; // sub-rota indexável (quando existir)
  numericOnly: boolean;
  /** intervalo de X-dimension (mm) recomendado pela GS1 / norma */
  xdim: { min: number; rec: number; max: number };
  /** altura mínima recomendada de barras em mm (0 para 2D) */
  minHeight: number;
  quietZone: number; // em múltiplos de X (1D) ou módulos (2D)
  usage: string;
  chars: string;
  acceptsLetters: boolean;
  typicalSize: string;
  placeholder: string;
  help: string;
}

export const SYMBOLOGIES: Symbology[] = [
  {
    id: "ean13",
    bcid: "ean13",
    label: "EAN-13 / GTIN-13",
    group: "varejo",
    slug: "ean-13",
    numericOnly: true,
    xdim: { min: 0.264, rec: 0.33, max: 0.66 },
    minHeight: 22.85,
    quietZone: 11,
    usage: "Varejo no Brasil (produto de consumo em gôndola)",
    chars: "12 dígitos + verificador",
    acceptsLetters: false,
    typicalSize: "37,29 × 25,93 mm (1,0×)",
    placeholder: "789123456789",
    help: "Digite 12 dígitos que o 13º (verificador) é calculado. Prefixos 789 e 790 são da GS1 Brasil.",
  },
  {
    id: "ean8",
    bcid: "ean8",
    label: "EAN-8 / GTIN-8",
    group: "varejo",
    slug: "ean-8",
    numericOnly: true,
    xdim: { min: 0.264, rec: 0.33, max: 0.66 },
    minHeight: 18.23,
    quietZone: 7,
    usage: "Embalagens pequenas de varejo",
    chars: "7 dígitos + verificador",
    acceptsLetters: false,
    typicalSize: "26,73 × 21,64 mm (1,0×)",
    placeholder: "7891234",
    help: "Use em embalagens onde não cabe um EAN-13. 7 dígitos + verificador automático.",
  },
  {
    id: "upca",
    bcid: "upca",
    label: "UPC-A",
    group: "varejo",
    slug: null,
    numericOnly: true,
    xdim: { min: 0.264, rec: 0.33, max: 0.66 },
    minHeight: 22.85,
    quietZone: 9,
    usage: "Exportação para Estados Unidos e Canadá",
    chars: "11 dígitos + verificador",
    acceptsLetters: false,
    typicalSize: "37,29 × 25,93 mm (1,0×)",
    placeholder: "01234567890",
    help: "Padrão norte-americano. 11 dígitos + verificador.",
  },
  {
    id: "itf14",
    bcid: "itf14",
    label: "ITF-14 / DUN-14",
    group: "logistica",
    slug: "itf-14",
    numericOnly: true,
    xdim: { min: 0.495, rec: 1.016, max: 1.016 },
    minHeight: 31.75,
    quietZone: 10,
    usage: "Caixa máster e embalagem de transporte (papelão ondulado)",
    chars: "13 dígitos + verificador",
    acceptsLetters: false,
    typicalSize: "142,75 × 32 mm (1,0×)",
    placeholder: "1789123456789",
    help: "Gere a partir de um EAN-13 informando o indicador de agrupamento (1 a 8). Use bearer bar em papelão.",
  },
  {
    id: "gs1-128",
    bcid: "gs1-128",
    label: "GS1-128 (EAN-128)",
    group: "logistica",
    slug: "gs1-128",
    numericOnly: false,
    xdim: { min: 0.495, rec: 0.635, max: 1.016 },
    minHeight: 31.75,
    quietZone: 10,
    usage: "Etiqueta logística: lote, validade, quantidade, GTIN, série",
    chars: "Variável (Application Identifiers)",
    acceptsLetters: true,
    typicalSize: "Largura conforme conteúdo × 32 mm",
    placeholder: "(01)07891234567895(10)LOTE123",
    help: "Monte os Application Identifiers no construtor. O FNC1 e os separadores GS são inseridos automaticamente.",
  },
  {
    id: "sscc18",
    bcid: "sscc18",
    label: "SSCC-18",
    group: "logistica",
    slug: "sscc",
    numericOnly: true,
    xdim: { min: 0.495, rec: 0.635, max: 1.016 },
    minHeight: 31.75,
    quietZone: 10,
    usage: "Unidade logística / pallet (AI 00)",
    chars: "17 dígitos + verificador",
    acceptsLetters: false,
    typicalSize: "Largura conforme ampliação × 32 mm",
    placeholder: "789123456789012345",
    help: "Monte com dígito de extensão + prefixo GS1 da empresa + serial. O verificador é calculado.",
  },
  {
    id: "code128",
    bcid: "code128",
    label: "Code 128",
    group: "industrial",
    slug: "code-128",
    numericOnly: false,
    xdim: { min: 0.19, rec: 0.375, max: 1.016 },
    minHeight: 12,
    quietZone: 10,
    usage: "Uso interno, ativos, ordens de produção, WMS",
    chars: "Variável (ASCII completo)",
    acceptsLetters: true,
    typicalSize: "Conforme conteúdo × 15 a 25 mm",
    placeholder: "ADX-2026-0001",
    help: "Aceita letras, números e símbolos. O subset A/B/C ótimo é escolhido automaticamente.",
  },
  {
    id: "code39",
    bcid: "code39",
    label: "Code 39",
    group: "industrial",
    slug: "code-39",
    numericOnly: false,
    xdim: { min: 0.19, rec: 0.375, max: 1.016 },
    minHeight: 12,
    quietZone: 10,
    usage: "Legado industrial, patrimônio, automotivo",
    chars: "A-Z, 0-9 e - . $ / + % espaço",
    acceptsLetters: true,
    typicalSize: "Conforme conteúdo × 15 a 25 mm",
    placeholder: "ADECONEX39",
    help: "Simbologia legada. Pode incluir dígito verificador módulo 43 e modo Full ASCII.",
  },
  {
    id: "itf",
    bcid: "interleaved2of5",
    label: "ITF / 2 de 5 Intercalado",
    group: "industrial",
    slug: null,
    numericOnly: true,
    xdim: { min: 0.19, rec: 0.375, max: 1.016 },
    minHeight: 12,
    quietZone: 10,
    usage: "Boletos bancários e logística",
    chars: "Somente dígitos, quantidade par",
    acceptsLetters: false,
    typicalSize: "Conforme conteúdo × 15 a 25 mm",
    placeholder: "12345678",
    help: "Exige quantidade par de dígitos — completamos com zero à esquerda quando necessário.",
  },
  {
    id: "codabar",
    bcid: "rationalizedCodabar",
    label: "Codabar",
    group: "industrial",
    slug: null,
    numericOnly: false,
    xdim: { min: 0.19, rec: 0.375, max: 1.016 },
    minHeight: 12,
    quietZone: 10,
    usage: "Bibliotecas, bancos de sangue, logística leve",
    chars: "0-9 e - $ : / . + (com start/stop A-D)",
    acceptsLetters: true,
    typicalSize: "Conforme conteúdo × 15 a 25 mm",
    placeholder: "A12345678B",
    help: "Comece e termine com uma letra de A a D (caracteres de start/stop).",
  },
  {
    id: "msi",
    bcid: "msi",
    label: "MSI Plessey",
    group: "industrial",
    slug: null,
    numericOnly: true,
    xdim: { min: 0.19, rec: 0.375, max: 1.016 },
    minHeight: 12,
    quietZone: 12,
    usage: "Controle de estoque em prateleira",
    chars: "Somente dígitos",
    acceptsLetters: false,
    typicalSize: "Conforme conteúdo × 15 a 25 mm",
    placeholder: "1234567",
    help: "Usado em gôndola e inventário de prateleira.",
  },
  {
    id: "qrcode",
    bcid: "qrcode",
    label: "QR Code",
    group: "2d",
    slug: "qr-code",
    numericOnly: false,
    xdim: { min: 0.25, rec: 0.5, max: 1.5 },
    minHeight: 0,
    quietZone: 4,
    usage: "Link, Wi-Fi, Pix, contato, rastreio interno",
    chars: "Até ~4.000 caracteres",
    acceptsLetters: true,
    typicalSize: "20 × 20 mm ou mais",
    placeholder: "https://www.adeconex.com.br",
    help: "Escolha o nível de correção de erro. H suporta logotipo e sujeira, mas ocupa mais espaço.",
  },
  {
    id: "gs1-datamatrix",
    bcid: "gs1datamatrix",
    label: "GS1 DataMatrix",
    group: "2d",
    slug: "gs1-datamatrix",
    numericOnly: false,
    xdim: { min: 0.25, rec: 0.5, max: 1.5 },
    minHeight: 0,
    quietZone: 1,
    usage: "Rastreabilidade de medicamentos (SNCM/ANVISA), autopeças, eletrônicos",
    chars: "Variável (Application Identifiers)",
    acceptsLetters: true,
    typicalSize: "10 × 10 mm ou mais",
    placeholder: "(01)07891234567895(21)SERIE001",
    help: "Mesmo construtor de AIs do GS1-128, em formato 2D compacto.",
  },
  {
    id: "pdf417",
    bcid: "pdf417",
    label: "PDF417",
    group: "2d",
    slug: null,
    numericOnly: false,
    xdim: { min: 0.25, rec: 0.5, max: 1.0 },
    minHeight: 0,
    quietZone: 2,
    usage: "Documentos brasileiros (CNH, DANFE) e crachás",
    chars: "Até ~1.800 caracteres",
    acceptsLetters: true,
    typicalSize: "60 × 15 mm ou mais",
    placeholder: "ADECONEX|CRACHA|0001",
    help: "Código empilhado, usado em documentos e credenciais.",
  },
];

export const SYMBOLOGY_BY_ID = Object.fromEntries(
  SYMBOLOGIES.map((s) => [s.id, s]),
) as Record<SymbologyId, Symbology>;

export const SLUG_TO_SYMBOLOGY: Record<string, SymbologyId> = Object.fromEntries(
  SYMBOLOGIES.filter((s) => s.slug).map((s) => [s.slug as string, s.id]),
);

/* ---------------------------------------------------------------- dígitos */

/** Dígito verificador GS1 (módulo 10, pesos 3/1 da direita para a esquerda). */
export function gs1CheckDigit(digits: string): number {
  let sum = 0;
  const rev = digits.split("").reverse();
  for (let i = 0; i < rev.length; i++) {
    const n = Number(rev[i]);
    sum += n * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

const CODE39_SET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

/** Dígito verificador módulo 43 do Code 39. */
export function mod43CheckChar(value: string): string {
  let sum = 0;
  for (const ch of value.toUpperCase()) {
    const idx = CODE39_SET.indexOf(ch);
    if (idx < 0) return "";
    sum += idx;
  }
  return CODE39_SET[sum % 43];
}

/** Dígito verificador módulo 10 do MSI Plessey. */
export function msiCheckDigit(digits: string): number {
  const rev = digits.split("").reverse();
  let odd = "";
  let evenSum = 0;
  rev.forEach((d, i) => {
    if (i % 2 === 0) odd += d;
    else evenSum += Number(d);
  });
  const doubled = String(Number(odd.split("").reverse().join("")) * 2);
  const doubledSum = doubled.split("").reduce((a, d) => a + Number(d), 0);
  return (10 - ((doubledSum + evenSum) % 10)) % 10;
}

export const GS1_BR_PREFIXES = ["789", "790"];

export interface ValidationResult {
  ok: boolean;
  /** impede a geração (código impossível de ler) */
  blocking: boolean;
  message?: string;
  /** valor sugerido para o botão "corrigir" */
  fix?: string;
  info?: string;
}

const onlyDigits = (v: string) => /^\d+$/.test(v);

/** Valida a entrada de acordo com a simbologia e sugere correções em português. */
export function validateValue(id: SymbologyId, raw: string): ValidationResult {
  const value = raw.trim();
  if (!value) return { ok: false, blocking: true, message: "Digite o conteúdo do código." };

  const sym = SYMBOLOGY_BY_ID[id];
  if (sym.numericOnly && !onlyDigits(value)) {
    return {
      ok: false,
      blocking: true,
      message: `${sym.label} aceita somente dígitos — remova letras, espaços e símbolos.`,
    };
  }

  const gtin = (len: number, name: string): ValidationResult => {
    const body = len - 1;
    if (value.length !== body && value.length !== len) {
      return {
        ok: false,
        blocking: true,
        message: `${name} precisa de ${body} ou ${len} dígitos — você digitou ${value.length}.`,
      };
    }
    if (value.length === body) {
      const cd = gs1CheckDigit(value);
      return {
        ok: true,
        blocking: false,
        info: `Dígito verificador calculado: ${cd}. O código final será ${value}${cd}.`,
        fix: `${value}${cd}`,
      };
    }
    const expected = gs1CheckDigit(value.slice(0, body));
    const informed = Number(value[body]);
    if (expected !== informed) {
      return {
        ok: false,
        blocking: true,
        message: `O dígito verificador informado é ${informed}, mas o correto para esse número é ${expected}. Quer que eu corrija?`,
        fix: `${value.slice(0, body)}${expected}`,
      };
    }
    return { ok: true, blocking: false };
  };

  switch (id) {
    case "ean13": {
      const r = gtin(13, "EAN-13");
      if (r.ok) {
        const prefix = value.slice(0, 3);
        const br = GS1_BR_PREFIXES.includes(prefix);
        return {
          ...r,
          info: [
            r.info,
            br
              ? `Prefixo ${prefix}: numeração da GS1 Brasil.`
              : `Prefixo ${prefix}: não é da GS1 Brasil (789/790).`,
          ]
            .filter(Boolean)
            .join(" "),
        };
      }
      return r;
    }
    case "ean8":
      return gtin(8, "EAN-8");
    case "upca":
      return gtin(12, "UPC-A");
    case "itf14":
      return gtin(14, "ITF-14");
    case "sscc18":
      return gtin(18, "SSCC-18");
    case "itf": {
      if (value.length % 2 !== 0) {
        return {
          ok: true,
          blocking: false,
          info: `ITF exige quantidade par de dígitos — vamos completar com zero à esquerda: 0${value}.`,
          fix: `0${value}`,
        };
      }
      return { ok: true, blocking: false };
    }
    case "code39": {
      const invalid = value
        .toUpperCase()
        .split("")
        .filter((c) => CODE39_SET.indexOf(c) < 0);
      if (invalid.length) {
        return {
          ok: false,
          blocking: true,
          message: `Code 39 não aceita ${[...new Set(invalid)].join(" ")} — use A-Z, 0-9 e - . $ / + % espaço.`,
        };
      }
      return { ok: true, blocking: false };
    }
    case "codabar": {
      if (!/^[A-Da-d][0-9\-$:/.+]*[A-Da-d]$/.test(value)) {
        return {
          ok: false,
          blocking: true,
          message: "Codabar precisa começar e terminar com uma letra de A a D (start/stop).",
        };
      }
      return { ok: true, blocking: false };
    }
    case "gs1-128":
    case "gs1-datamatrix": {
      if (!/^\(\d{2,4}\)/.test(value)) {
        return {
          ok: false,
          blocking: true,
          message: "Informe pelo menos um Application Identifier entre parênteses, como (01).",
        };
      }
      return { ok: true, blocking: false };
    }
    default:
      return { ok: true, blocking: false };
  }
}

/** Calcula/normaliza o valor completo com dígito verificador quando aplicável. */
export function withCheckDigit(id: SymbologyId, raw: string, code39Mod43 = false): string {
  const value = raw.trim();
  const lens: Partial<Record<SymbologyId, number>> = {
    ean13: 13,
    ean8: 8,
    upca: 12,
    itf14: 14,
    sscc18: 18,
  };
  const len = lens[id];
  if (len) {
    const body = value.slice(0, len - 1);
    if (body.length === len - 1) return `${body}${gs1CheckDigit(body)}`;
    return value;
  }
  if (id === "itf") return value.length % 2 ? `0${value}` : value;
  if (id === "code39" && code39Mod43) return `${value}${mod43CheckChar(value)}`;
  if (id === "msi") return value;
  return value;
}
