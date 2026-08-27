/**
 * Modelo de dados do editor de Etiqueta Personalizada.
 * Isomórfico: usado tanto no cliente (editor) quanto no servidor (validação).
 */

export type LabelLayer =
  | {
      id: string;
      kind: "text";
      x: number;
      y: number;
      w: number;
      text: string;
      fontSize: number; // pt
      fontFamily: string;
      bold: boolean;
      italic: boolean;
      align: "left" | "center" | "right";
      letterSpacing: number;
      rotation: 0 | 90 | 180 | 270;
    }
  | {
      id: string;
      kind: "barcode";
      x: number;
      y: number;
      w: number;
      h: number;
      symbology: string;
      value: string;
      showText: boolean;
      rotation: 0 | 90 | 180 | 270;
    }
  | {
      id: string;
      kind: "qrcode";
      x: number;
      y: number;
      w: number;
      value: string;
      rotation: 0 | 90 | 180 | 270;
    }
  | {
      id: string;
      kind: "image";
      x: number;
      y: number;
      w: number;
      h: number;
      dataUrl: string;
      rotation: 0 | 90 | 180 | 270;
    };

export type LabelShape = "rect" | "rounded" | "circle" | "oval";

export type LabelDesign = {
  id: string | null;
  name: string;
  base_product_id: string | null;
  width_mm: number;
  height_mm: number;
  shape: LabelShape;
  corner_radius_mm: number | null;
  material: string;
  ribbon_color: string;
  background_color: string;
  layout: LabelLayer[];
};

/** Configuração de personalização definida no cadastro do produto. */
export type ProductLabelSpec = {
  id: string;
  name: string;
  slug: string;
  shape: LabelShape;
  width_mm: number;
  height_mm: number;
  corner_radius_mm: number | null;
  columns: number;
  rows: number;
  gap_x_mm: number;
  gap_y_mm: number;
  margin_mm: number;
  safe_margin_mm: number;
  notes: string | null;
};

export const SHAPE_LABELS: Record<LabelShape, string> = {
  rect: "Retangular",
  rounded: "Cantos arredondados",
  circle: "Redonda",
  oval: "Oval",
};

/** CSS border-radius correspondente ao formato/raio da etiqueta. */
export function shapeRadiusCss(
  shape: LabelShape,
  cornerRadiusMm: number | null | undefined,
  scale: number,
): string {
  if (shape === "circle" || shape === "oval") return "50%";
  if (shape === "rounded") return `${Math.max(0, (cornerRadiusMm ?? 3)) * scale}px`;
  return "0px";
}

/** 1 pt em mm — usado para estimar a altura de um texto. */
const PT_TO_MM = 25.4 / 72;

/** Área útil (mm) onde a arte pode ficar sem risco de corte. */
export function safeArea(
  width: number,
  height: number,
  shape: LabelShape,
  safeMarginMm = 0,
): { x: number; y: number; w: number; h: number } {
  if (shape === "circle" || shape === "oval") {
    // retângulo inscrito na elipse (fator 1/√2) menos a margem de segurança
    const w = (width / Math.SQRT2) - safeMarginMm * 2;
    const h = (height / Math.SQRT2) - safeMarginMm * 2;
    return { x: (width - w) / 2, y: (height - h) / 2, w: Math.max(4, w), h: Math.max(4, h) };
  }
  const m = safeMarginMm + (shape === "rounded" ? Math.max(1, (cornerHint(width, height)) * 0.15) : 1);
  return { x: m, y: m, w: Math.max(4, width - m * 2), h: Math.max(4, height - m * 2) };
}

function cornerHint(w: number, h: number) {
  return Math.min(w, h) * 0.1;
}

/** Altura aproximada ocupada por uma camada (mm). */
export function layerBoxHeight(l: LabelLayer): number {
  if (l.kind === "text") return Math.max(2, l.fontSize * PT_TO_MM * 1.25);
  if (l.kind === "qrcode") return l.w;
  return l.h;
}

const layerHeight = layerBoxHeight;

/** Largura realmente ocupada (mm) — texto usa estimativa do glifo, não a caixa. */
function layerWidth(l: LabelLayer): number {
  if (l.kind === "text") {
    const chars = Math.max(1, l.text.replace(/\n.*/s, "").length);
    const est = chars * l.fontSize * PT_TO_MM * (l.bold ? 0.62 : 0.56);
    return Math.min(l.w, Math.max(2, est));
  }
  return l.w;
}

/**
 * Reposiciona e redimensiona a arte para caber na área útil da etiqueta,
 * mantendo a ordem e as proporções entre os elementos.
 * Formatos redondos/ovais centralizam; retangulares alinham à esquerda.
 */
export function fitLayoutToLabel(
  layers: LabelLayer[],
  design: Pick<LabelDesign, "width_mm" | "height_mm" | "shape">,
  safeMarginMm = 0,
): LabelLayer[] {
  if (layers.length === 0) return layers;
  const box = safeArea(design.width_mm, design.height_mm, design.shape, safeMarginMm);
  const centered = design.shape === "circle" || design.shape === "oval";

  const ordered = [...layers].sort((a, b) => a.y - b.y || a.x - b.x);

  // caixa original da arte (usando a largura realmente ocupada)
  const minX = Math.min(...ordered.map((l) => l.x));
  const minY = Math.min(...ordered.map((l) => l.y));
  const maxX = Math.max(...ordered.map((l) => l.x + layerWidth(l)));
  const maxY = Math.max(...ordered.map((l) => l.y + layerHeight(l)));
  const srcW = Math.max(1, maxX - minX);
  const srcH = Math.max(1, maxY - minY);

  const s = Math.min(box.w / srcW, box.h / srcH);
  const offX = box.x + (box.w - srcW * s) / 2;
  const offY = box.y + (box.h - srcH * s) / 2;

  return ordered.map((l) => {
    const w = Math.max(2, round1(l.w * s));
    const y = round1(offY + (l.y - minY) * s);
    const base = { ...l, y };

    if (l.kind === "text") {
      const fontSize = Math.max(3, round1(l.fontSize * s));
      // texto sempre usa a largura útil disponível para não quebrar linha
      return {
        ...base,
        kind: "text",
        x: round1(box.x),
        w: round1(box.w),
        align: centered ? "center" : l.align,
        fontSize,
      } as LabelLayer;
    }

    const x = centered
      ? round1(box.x + (box.w - w) / 2)
      : round1(offX + (l.x - minX) * s);

    if (l.kind === "qrcode") return { ...base, x, w } as LabelLayer;
    return { ...base, x, w, h: Math.max(2, round1(l.h * s)) } as LabelLayer;
  });
}


function round1(v: number) {
  return Math.round(v * 10) / 10;
}

/** Cria um design já ajustado ao formato/medidas do produto-base. */
export function designFromSpec(spec: ProductLabelSpec, base?: Partial<LabelDesign>): LabelDesign {
  const target = {
    width_mm: spec.width_mm,
    height_mm: spec.height_mm,
    shape: spec.shape,
  };
  return {
    ...emptyDesign(),
    ...base,
    ...target,
    base_product_id: spec.id,
    name: base?.name ?? `Personalização — ${spec.name}`,
    corner_radius_mm: spec.corner_radius_mm,
    layout: fitLayoutToLabel(base?.layout ?? [], target, spec.safe_margin_mm ?? 0),
  };
}


export type PriceTier = { min_quantity: number; unit_price: number };


/** Materiais disponíveis (cor/base do substrato). */
export const MATERIALS: { value: string; label: string; background: string; hint: string }[] = [
  { value: "couche_branco", label: "Couché branco", background: "#ffffff", hint: "Uso geral, impressão por transferência térmica" },
  { value: "bopp_branco", label: "BOPP branco", background: "#fbfbfb", hint: "Resistente a água e umidade" },
  { value: "bopp_transparente", label: "BOPP transparente", background: "#eaf2f6", hint: "Efeito “sem rótulo”" },
  { value: "bopp_prata", label: "BOPP prata / fosco", background: "#d7dade", hint: "Patrimônio e identificação industrial" },
  { value: "termico", label: "Térmico (sem ribbon)", background: "#fdfdf7", hint: "Impressão direta, sem ribbon" },
];

/** Cores de ribbon oferecidas — impressão sempre em UMA cor. */
export const RIBBON_COLORS: { value: string; label: string }[] = [
  { value: "#111111", label: "Preto" },
  { value: "#e63946", label: "Vermelho" },
  { value: "#1d4ed8", label: "Azul" },
  { value: "#15803d", label: "Verde" },
  { value: "#b45309", label: "Dourado / Ouro" },
  { value: "#ffffff", label: "Branco" },
];

export const LABEL_FONTS = [
  "Inter, sans-serif",
  "Space Grotesk, sans-serif",
  "Arial, Helvetica, sans-serif",
  "Georgia, serif",
  "Courier New, monospace",
];

export const MIN_CUSTOM_QUANTITY = 100;

export function materialBackground(material: string): string {
  return MATERIALS.find((m) => m.value === material)?.background ?? "#ffffff";
}

export function materialLabel(material: string): string {
  return MATERIALS.find((m) => m.value === material)?.label ?? material;
}

export function ribbonLabel(color: string): string {
  return RIBBON_COLORS.find((c) => c.value.toLowerCase() === color.toLowerCase())?.label ?? color;
}

/** Preço unitário conforme a faixa de quantidade (maior faixa aplicável). */
export function unitPriceForQuantity(tiers: PriceTier[], quantity: number): number {
  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  let price = sorted[0]?.unit_price ?? 0;
  for (const t of sorted) if (quantity >= t.min_quantity) price = t.unit_price;
  return price;
}

export function newLayerId(): string {
  return `l_${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyDesign(): LabelDesign {
  return {
    id: null,
    name: "Minha etiqueta",
    base_product_id: null,
    width_mm: 100,
    height_mm: 50,
    shape: "rect",
    corner_radius_mm: null,
    material: "couche_branco",
    ribbon_color: "#111111",
    background_color: materialBackground("couche_branco"),
    layout: [],
  };
}

/** Modelos prontos de referência que o cliente edita a partir de um clique. */
export const LABEL_TEMPLATES: { id: string; name: string; description: string; build: () => LabelDesign }[] = [
  {
    id: "identificacao",
    name: "Identificação de produto",
    description: "Nome, descrição e código de barras EAN-13",
    build: () => ({
      ...emptyDesign(),
      name: "Identificação de produto",
      width_mm: 100,
      height_mm: 50,
      layout: [
        {
          id: newLayerId(), kind: "text", x: 6, y: 5, w: 88, text: "NOME DO PRODUTO",
          fontSize: 16, fontFamily: LABEL_FONTS[0], bold: true, italic: false, align: "left", letterSpacing: 0, rotation: 0,
        },
        {
          id: newLayerId(), kind: "text", x: 6, y: 15, w: 88, text: "Descrição / referência do item",
          fontSize: 9, fontFamily: LABEL_FONTS[0], bold: false, italic: false, align: "left", letterSpacing: 0, rotation: 0,
        },
        {
          id: newLayerId(), kind: "barcode", x: 6, y: 22, w: 60, h: 22,
          symbology: "ean13", value: "7891234567895", showText: true, rotation: 0,
        },
      ],
    }),
  },
  {
    id: "validade",
    name: "Prazo de validade",
    description: "Lote, fabricação e validade em destaque",
    build: () => ({
      ...emptyDesign(),
      name: "Prazo de validade",
      width_mm: 60,
      height_mm: 40,
      layout: [
        {
          id: newLayerId(), kind: "text", x: 4, y: 4, w: 52, text: "VALIDADE",
          fontSize: 14, fontFamily: LABEL_FONTS[0], bold: true, italic: false, align: "center", letterSpacing: 1, rotation: 0,
        },
        {
          id: newLayerId(), kind: "text", x: 4, y: 14, w: 52, text: "FAB: __/__/____",
          fontSize: 10, fontFamily: LABEL_FONTS[0], bold: false, italic: false, align: "left", letterSpacing: 0, rotation: 0,
        },
        {
          id: newLayerId(), kind: "text", x: 4, y: 22, w: 52, text: "VAL: __/__/____",
          fontSize: 10, fontFamily: LABEL_FONTS[0], bold: true, italic: false, align: "left", letterSpacing: 0, rotation: 0,
        },
        {
          id: newLayerId(), kind: "text", x: 4, y: 30, w: 52, text: "LOTE: 0000",
          fontSize: 9, fontFamily: LABEL_FONTS[0], bold: false, italic: false, align: "left", letterSpacing: 0, rotation: 0,
        },
      ],
    }),
  },
  {
    id: "qr-marca",
    name: "Marca + QR Code",
    description: "Logo/nome da marca com QR para o site",
    build: () => ({
      ...emptyDesign(),
      name: "Marca + QR Code",
      width_mm: 50,
      height_mm: 50,
      layout: [
        {
          id: newLayerId(), kind: "text", x: 4, y: 3, w: 42, text: "SUA MARCA",
          fontSize: 12, fontFamily: LABEL_FONTS[1], bold: true, italic: false, align: "center", letterSpacing: 1, rotation: 0,
        },
        { id: newLayerId(), kind: "qrcode", x: 8, y: 11, w: 34, value: "https://adeconex.com.br", rotation: 0 },
        {
          id: newLayerId(), kind: "text", x: 4, y: 45, w: 42, text: "aponte a câmera",
          fontSize: 7, fontFamily: LABEL_FONTS[0], bold: false, italic: false, align: "center", letterSpacing: 0, rotation: 0,
        },
      ],
    }),
  },

  {
    id: "patrimonio",
    name: "Patrimônio / ativo",
    description: "Code 128 com número de ativo",
    build: () => ({
      ...emptyDesign(),
      name: "Patrimônio",
      width_mm: 60,
      height_mm: 30,
      material: "bopp_prata",
      background_color: materialBackground("bopp_prata"),
      layout: [
        {
          id: newLayerId(), kind: "text", x: 4, y: 3, w: 52, text: "PATRIMÔNIO",
          fontSize: 9, fontFamily: LABEL_FONTS[0], bold: true, italic: false, align: "left", letterSpacing: 1, rotation: 0,
        },
        {
          id: newLayerId(), kind: "barcode", x: 4, y: 10, w: 52, h: 16,
          symbology: "code128", value: "ATV-000123", showText: true, rotation: 0,
        },
      ],
    }),
  },
];
