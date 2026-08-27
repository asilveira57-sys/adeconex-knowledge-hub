/**
 * Renderização de códigos de barras no navegador (bwip-js) e exportação
 * em SVG, PNG (por DPI) e PDF A4 com grade de etiquetas (jsPDF).
 * Nada é enviado ao servidor.
 */

import type { SymbologyId } from "./symbologies";
import { SYMBOLOGY_BY_ID, gs1CheckDigit } from "./symbologies";

/** 1 unidade bwip = 1/72 pol = 0,352777 mm */
const UNIT_MM = 25.4 / 72;

export type Rotation = 0 | 90 | 180 | 270;

export interface RenderOptions {
  symbology: SymbologyId;
  value: string;
  xdim: number; // mm
  barHeight: number; // mm
  quietZone: number; // mm
  showText: boolean;
  textPosition: "above" | "below";
  textSize: number; // pt
  textFont: string;
  altText?: string;
  barColor: string; // #rrggbb
  bgColor: string; // #rrggbb
  transparent: boolean;
  rotation: Rotation;
  // específicos
  eccLevel?: "L" | "M" | "Q" | "H";
  bearerBar?: boolean;
  code39Mod43?: boolean;
  code39FullAscii?: boolean;
  forceSubset?: "auto" | "A" | "B" | "C";
  addon?: string;
}

const hex = (c: string) => c.replace("#", "").toUpperCase();

let bwipPromise: Promise<typeof import("bwip-js/browser")> | null = null;
async function bwip() {
  if (!bwipPromise) bwipPromise = import("bwip-js/browser");
  return bwipPromise;
}

function bwipOptions(o: RenderOptions): Record<string, unknown> {
  const sym = SYMBOLOGY_BY_ID[o.symbology];
  const is2d = sym.group === "2d";
  const scale = Math.max(0.1, o.xdim / UNIT_MM);

  const opts: Record<string, unknown> = {
    bcid: sym.bcid,
    text: o.addon ? `${o.value} ${o.addon}` : o.value,
    scale,
    barcolor: hex(o.barColor),
    includetext: o.showText,
    textxalign: "center",
    textsize: Math.max(4, o.textSize),
    textfont: o.textFont,
    paddingwidth: Math.max(0, o.quietZone) / UNIT_MM / scale,
    paddingheight: is2d ? Math.max(0, o.quietZone) / UNIT_MM / scale : 0,
    rotate: o.rotation === 90 ? "R" : o.rotation === 180 ? "I" : o.rotation === 270 ? "L" : "N",
  };

  if (!o.transparent) opts.backgroundcolor = hex(o.bgColor);
  if (!is2d) opts.height = Math.max(2, o.barHeight);
  if (is2d) {
    opts.height = undefined;
    delete opts.height;
  }
  if (o.showText && o.textPosition === "above") opts.textyoffset = -(o.barHeight + 2);
  if (o.altText) opts.alttext = o.altText;

  switch (o.symbology) {
    case "qrcode":
      opts.eclevel = o.eccLevel ?? "M";
      opts.includetext = false;
      break;
    case "gs1-datamatrix":
    case "pdf417":
      opts.includetext = false;
      break;
    case "itf14":
      opts.borderwidth = o.bearerBar ? 4.5 : 0;
      opts.includetext = o.showText;
      if (o.bearerBar) {
        opts.borderleft = 4.5;
        opts.borderright = 4.5;
      }
      break;
    case "code39":
      if (o.code39Mod43) opts.includecheck = true;
      if (o.code39FullAscii) opts.bcid = "code39ext";
      break;
    case "code128":
      if (o.forceSubset && o.forceSubset !== "auto") {
        opts.text = `^FNC3${o.value}`;
        opts.text = o.value;
        opts.encoding = o.forceSubset.toLowerCase(); // auto | a | b | c
      }
      break;
    case "gs1-128":
      opts.parsefnc = true;
      break;
    case "msi":
      opts.includecheck = true;
      break;
    default:
      break;
  }
  return opts;
}

export interface RenderResult {
  svg: string;
  widthMm: number;
  heightMm: number;
}

/** Gera o código em SVG com dimensões físicas reais em milímetros. */
export async function renderBarcodeSvg(o: RenderOptions): Promise<RenderResult> {
  const lib = await bwip();
  const raw = lib.toSVG(bwipOptions(o) as never);

  const openTagMatch = /<svg[^>]*>/.exec(raw);
  const openTag = openTagMatch?.[0] ?? "<svg>";
  const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(openTag);
  const wAttr = /\bwidth="([\d.]+)/.exec(openTag);
  const hAttr = /\bheight="([\d.]+)/.exec(openTag);
  const wUnits = Number(vb?.[1] ?? wAttr?.[1] ?? 0);
  const hUnits = Number(vb?.[2] ?? hAttr?.[1] ?? 0);
  const widthMm = wUnits * UNIT_MM;
  const heightMm = hUnits * UNIT_MM;

  // Reescreve APENAS a tag <svg> de abertura (nunca stroke-width dos caminhos).
  let newTag = openTag
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace(
      "<svg",
      `<svg width="${widthMm.toFixed(3)}mm" height="${heightMm.toFixed(3)}mm"`,
    );
  if (!vb) newTag = newTag.replace("<svg", `<svg viewBox="0 0 ${wUnits} ${hUnits}"`);
  const svg = openTagMatch ? raw.replace(openTag, newTag) : raw;

  return { svg, widthMm, heightMm };

}

/** Rasteriza um SVG para PNG (dataURL) no DPI informado. */
export async function svgToPngDataUrl(
  svg: string,
  widthMm: number,
  heightMm: number,
  dpi: number,
  transparent: boolean,
  bgColor: string,
): Promise<string> {
  const pxW = Math.max(1, Math.round((widthMm / 25.4) * dpi));
  const pxH = Math.max(1, Math.round((heightMm / 25.4) * dpi));
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Falha ao rasterizar o código."));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext("2d")!;
    if (!transparent) {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, pxW, pxH);
    }
    ctx.drawImage(img, 0, 0, pxW, pxH);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ------------------------------------------------------------ contraste */

function luminance(hexColor: string): number {
  const c = hexColor.replace("#", "");
  const rgb = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrastCheck(barColor: string, bgColor: string, transparent: boolean) {
  const bg = transparent ? "#ffffff" : bgColor;
  const l1 = luminance(barColor);
  const l2 = luminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  const barIsLight = l1 > 0.4;
  const bgIsDark = l2 < 0.6;
  const red = /^#?(e|f|c|d)[0-9a-f]/i.test(barColor) && luminance(barColor) < 0.4 && barColor.toLowerCase() !== "#000000";

  let level: "ok" | "atencao" | "ruim" = "ok";
  let message = "Contraste adequado para leitura por scanner.";
  if (ratio < 4) {
    level = "ruim";
    message = "Contraste insuficiente: a maioria dos scanners não vai ler essa combinação.";
  } else if (barIsLight || bgIsDark) {
    level = "ruim";
    message = "Barras claras ou fundo escuro não são lidos por scanner. Use barras escuras sobre fundo claro.";
  } else if (red) {
    level = "atencao";
    message = "Tons de vermelho podem ficar invisíveis para leitores com luz vermelha (630 nm). Prefira preto ou azul escuro.";
  } else if (ratio < 7) {
    level = "atencao";
    message = "Contraste no limite. Para impressão térmica, prefira barras pretas sobre fundo branco.";
  }
  return { ratio, level, message };
}

/* ------------------------------------------------------------ sequência */

const GTIN_LEN: Partial<Record<SymbologyId, number>> = {
  ean13: 13,
  ean8: 8,
  upca: 12,
  itf14: 14,
  sscc18: 18,
};

/** Gera a sequência de valores para a folha A4 (repetir ou incrementar). */
export function buildSequence(
  symbology: SymbologyId,
  base: string,
  count: number,
  mode: "repeat" | "increment",
  start: number,
  step: number,
): string[] {
  if (mode === "repeat") return Array.from({ length: count }, () => base);

  const len = GTIN_LEN[symbology];
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const n = start + i * step;
    if (len) {
      const body = base.slice(0, len - 1);
      const prefixLen = Math.max(0, body.length - String(n).length);
      const next = `${body.slice(0, prefixLen)}${String(n).padStart(body.length - prefixLen, "0")}`.slice(0, len - 1);
      out.push(`${next}${gs1CheckDigit(next)}`);
    } else {
      const m = /^(.*?)(\d+)$/.exec(base);
      if (m) out.push(`${m[1]}${String(n).padStart(m[2].length, "0")}`);
      else out.push(`${base}${n}`);
    }
  }
  return out;
}

/* ----------------------------------------------------------------- PDF */

export interface SheetPreset {
  id: string;
  label: string;
  cols: number;
  rows: number;
  labelW: number;
  labelH: number;
  marginX: number;
  marginY: number;
  gapX: number;
  gapY: number;
}

export const SHEET_PRESETS: SheetPreset[] = [
  { id: "a4-2x5", label: "2 × 5 — 10 etiquetas (99,1 × 57,3 mm)", cols: 2, rows: 5, labelW: 99.1, labelH: 57.3, marginX: 4.6, marginY: 4.5, gapX: 2.5, gapY: 0 },
  { id: "a4-3x7", label: "3 × 7 — 21 etiquetas (63,5 × 38,1 mm)", cols: 3, rows: 7, labelW: 63.5, labelH: 38.1, marginX: 7.2, marginY: 15.1, gapX: 2.5, gapY: 0 },
  { id: "a4-3x9", label: "3 × 9 — 27 etiquetas (63,5 × 29,6 mm)", cols: 3, rows: 9, labelW: 63.5, labelH: 29.6, marginX: 7.2, marginY: 15.1, gapX: 2.5, gapY: 0 },
  { id: "a4-4x10", label: "4 × 10 — 40 etiquetas (45,7 × 25,4 mm)", cols: 4, rows: 10, labelW: 45.7, labelH: 25.4, marginX: 9.7, marginY: 21.5, gapX: 2.5, gapY: 0 },
  { id: "a4-5x13", label: "5 × 13 — 65 etiquetas (38,1 × 21,2 mm)", cols: 5, rows: 13, labelW: 38.1, labelH: 21.2, marginX: 5.9, marginY: 10.7, gapX: 2.5, gapY: 0 },
  { id: "a4-2x8", label: "2 × 8 — 16 etiquetas (99,1 × 33,9 mm)", cols: 2, rows: 8, labelW: 99.1, labelH: 33.9, marginX: 4.6, marginY: 12.9, gapX: 2.5, gapY: 0 },
  { id: "a4-1x1", label: "Etiqueta única centralizada", cols: 1, rows: 1, labelW: 100, labelH: 60, marginX: 55, marginY: 118, gapX: 0, gapY: 0 },
];

export interface SheetConfig {
  cols: number;
  rows: number;
  labelW: number;
  labelH: number;
  marginX: number;
  marginY: number;
  gapX: number;
  gapY: number;
  cropMarks: boolean;
  guides: boolean;
  dpi: number;
}

export async function buildLabelSheetPdf(
  options: RenderOptions,
  values: string[],
  sheet: SheetConfig,
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const perPage = sheet.cols * sheet.rows;

  // Cache de imagens por valor (a maioria dos casos repete o mesmo código).
  const cache = new Map<string, { data: string; w: number; h: number }>();
  const getImage = async (value: string) => {
    const hit = cache.get(value);
    if (hit) return hit;
    const r = await renderBarcodeSvg({ ...options, value });
    const data = await svgToPngDataUrl(
      r.svg,
      r.widthMm,
      r.heightMm,
      sheet.dpi,
      false,
      options.transparent ? "#ffffff" : options.bgColor,
    );
    const entry = { data, w: r.widthMm, h: r.heightMm };
    cache.set(value, entry);
    return entry;
  };

  for (let i = 0; i < values.length; i++) {
    const pageIndex = Math.floor(i / perPage);
    const cell = i % perPage;
    if (cell === 0 && pageIndex > 0) doc.addPage();

    const col = cell % sheet.cols;
    const row = Math.floor(cell / sheet.cols);
    const x = sheet.marginX + col * (sheet.labelW + sheet.gapX);
    const y = sheet.marginY + row * (sheet.labelH + sheet.gapY);

    if (sheet.guides) {
      doc.setDrawColor(200);
      doc.setLineWidth(0.1);
      doc.rect(x, y, sheet.labelW, sheet.labelH);
    }
    if (sheet.cropMarks) {
      doc.setDrawColor(120);
      doc.setLineWidth(0.1);
      const m = 2;
      doc.line(x - m, y, x - 0.5, y);
      doc.line(x, y - m, x, y - 0.5);
      doc.line(x + sheet.labelW + 0.5, y + sheet.labelH, x + sheet.labelW + m, y + sheet.labelH);
      doc.line(x + sheet.labelW, y + sheet.labelH + 0.5, x + sheet.labelW, y + sheet.labelH + m);
    }

    const img = await getImage(values[i]);
    const pad = 1.5;
    const maxW = sheet.labelW - pad * 2;
    const maxH = sheet.labelH - pad * 2;
    const scale = Math.min(maxW / img.w, maxH / img.h, 1);
    const w = img.w * scale;
    const h = img.h * scale;
    doc.addImage(
      img.data,
      "PNG",
      x + (sheet.labelW - w) / 2,
      y + (sheet.labelH - h) / 2,
      w,
      h,
      undefined,
      "FAST",
    );
  }

  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text(
    "Imprima em escala 100% / tamanho real — desative \"ajustar à página\". Gerado em adeconex.com.br",
    10,
    291,
  );

  return doc.output("blob");
}
