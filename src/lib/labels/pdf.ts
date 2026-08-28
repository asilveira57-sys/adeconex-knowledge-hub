import type { LabelDesign, LabelLayer, ProductLabelSpec } from "@/lib/labels/shared";

/** 1 pt = 0,3528 mm */
const PT_TO_MM = 25.4 / 72;

export type PdfPage = "label" | "a4" | "letter";
export type PdfOrientation = "auto" | "portrait" | "landscape";

export type LabelPdfOptions = {
  /** Tamanho da página: só a etiqueta (corte final) ou folha para impressão */
  page: PdfPage;
  orientation: PdfOrientation;
  /** Resolução usada para rasterizar códigos e imagens (dpi) */
  dpi: number;
  /** Marcas de corte / contorno tracejado da etiqueta */
  cutMarks: boolean;
  /** Imprimir o fundo da etiqueta (desligue para material colorido) */
  printBackground: boolean;
  /** Repetições por folha: usa colunas/linhas do produto quando disponível */
  spec?: ProductLabelSpec | null;
};

export const DEFAULT_PDF_OPTIONS: LabelPdfOptions = {
  page: "label",
  orientation: "auto",
  dpi: 600,
  cutMarks: true,
  printBackground: true,
};

const PAGE_MM: Record<Exclude<PdfPage, "label">, [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
};

function pdfFont(family: string): "helvetica" | "times" | "courier" {
  const f = (family || "").toLowerCase();
  if (f.includes("courier") || f.includes("mono")) return "courier";
  if (f.includes("times") || f.includes("serif") || f.includes("georgia")) return "times";
  return "helvetica";
}

/** Rasteriza um SVG em PNG na resolução pedida (fundo transparente). */
async function svgToPng(svg: string, widthMm: number, heightMm: number, dpi: number): Promise<string> {
  const pxW = Math.max(1, Math.round((widthMm / 25.4) * dpi));
  const pxH = Math.max(1, Math.round((heightMm / 25.4) * dpi));
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Falha ao rasterizar o elemento."));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = pxW;
    canvas.height = pxH;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, pxW, pxH);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function sizedSvg(svg: string, widthMm: number, heightMm: number, preserve: "none" | "xMidYMid meet") {
  const tag = /<svg[^>]*>/.exec(svg)?.[0];
  if (!tag) return svg;
  const next = tag
    .replace(/\swidth="[^"]*"/, "")
    .replace(/\sheight="[^"]*"/, "")
    .replace(/\spreserveAspectRatio="[^"]*"/, "")
    .replace("<svg", `<svg width="${widthMm}mm" height="${heightMm}mm" preserveAspectRatio="${preserve}"`);
  return svg.replace(tag, next);
}

type Raster = { data: string; layerId: string };

/** Pré-rasteriza códigos de barras, QR e imagens da arte. */
async function rasterizeLayers(design: LabelDesign, dpi: number): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const jobs: Promise<Raster | null>[] = design.layout.map(async (layer) => {
    try {
      if (layer.kind === "image") return { layerId: layer.id, data: layer.dataUrl };
      if (layer.kind === "qrcode") {
        const { buildMatrix, renderSvg, DEFAULT_STYLE } = await import("@/lib/qr/render");
        const matrix = buildMatrix(layer.value || " ", "M");
        const svg = renderSvg(matrix, {
          ...DEFAULT_STYLE,
          fgColor: design.ribbon_color,
          markerOuterColor: design.ribbon_color,
          markerInnerColor: design.ribbon_color,
          transparent: true,
          margin: 1,
        });
        const data = await svgToPng(sizedSvg(svg, layer.w, layer.w, "xMidYMid meet"), layer.w, layer.w, dpi);
        return { layerId: layer.id, data };
      }
      if (layer.kind === "barcode") {
        const { renderBarcodeSvg } = await import("@/lib/barcode/render");
        const res = await renderBarcodeSvg({
          symbology: layer.symbology as never,
          value: layer.value || "0000",
          xdim: 0.33,
          barHeight: 12,
          quietZone: 1,
          showText: layer.showText,
          textPosition: "below",
          textSize: 8,
          textFont: "Helvetica",
          barColor: design.ribbon_color,
          bgColor: "#ffffff",
          transparent: true,
          rotation: 0,
        });
        const data = await svgToPng(sizedSvg(res.svg, layer.w, layer.h, "none"), layer.w, layer.h, dpi);
        return { layerId: layer.id, data };
      }
    } catch {
      return null;
    }
    return null;
  });

  for (const r of await Promise.all(jobs)) if (r) out.set(r.layerId, r.data);
  return out;
}

type Doc = import("jspdf").jsPDF;

function drawShapeOutline(doc: Doc, design: LabelDesign, x: number, y: number, fill: boolean) {
  const { width_mm: w, height_mm: h, shape } = design;
  if (fill) doc.setFillColor(design.background_color);
  const style = fill ? "F" : "S";
  if (shape === "circle" || shape === "oval") {
    doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, style);
    return;
  }
  const r = shape === "rounded" ? Math.min(design.corner_radius_mm ?? 2, w / 2, h / 2) : 0;
  if (r > 0) doc.roundedRect(x, y, w, h, r, r, style);
  else doc.rect(x, y, w, h, style);
}

/** Desenha uma etiqueta completa com o canto superior esquerdo em (x, y) mm. */
function drawLabel(
  doc: Doc,
  design: LabelDesign,
  rasters: Map<string, string>,
  x: number,
  y: number,
  opts: LabelPdfOptions,
) {
  if (opts.printBackground) drawShapeOutline(doc, design, x, y, true);

  for (const layer of design.layout) {
    const lx = x + layer.x;
    const ly = y + layer.y;
    const rotation = layer.rotation ? -layer.rotation : 0;

    if (layer.kind === "text") {
      const sizeMm = layer.fontSize * PT_TO_MM;
      doc.setFont(pdfFont(layer.fontFamily), layer.italic ? "italic" : "normal", layer.bold ? "bold" : "normal");
      doc.setFontSize(layer.fontSize);
      doc.setTextColor(design.ribbon_color);
      doc.setCharSpace(layer.letterSpacing * PT_TO_MM);
      const lines = doc.splitTextToSize(layer.text ?? "", Math.max(1, layer.w)) as string[];
      const tx = layer.align === "center" ? lx + layer.w / 2 : layer.align === "right" ? lx + layer.w : lx;
      lines.forEach((line, i) => {
        doc.text(line, tx, ly + i * sizeMm * 1.15, {
          baseline: "top",
          align: layer.align,
          angle: rotation || undefined,
        });
      });
      doc.setCharSpace(0);
      continue;
    }

    const data = rasters.get(layer.id);
    if (!data) continue;
    const w = layer.w;
    const h = layer.kind === "qrcode" ? layer.w : layer.h;
    doc.addImage(data, "PNG", lx, ly, w, h, layer.id, "NONE", rotation);
  }

  if (opts.cutMarks) {
    doc.setDrawColor(150);
    doc.setLineWidth(0.1);
    doc.setLineDashPattern([1, 1], 0);
    drawShapeOutline(doc, design, x, y, false);
    doc.setLineDashPattern([], 0);
  }
}

function resolveOrientation(w: number, h: number, o: PdfOrientation): "portrait" | "landscape" {
  if (o === "auto") return w > h ? "landscape" : "portrait";
  return o;
}

export async function buildLabelPdfBlob(design: LabelDesign, options: LabelPdfOptions): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const rasters = await rasterizeLayers(design, options.dpi);

  if (options.page === "label") {
    const orientation = resolveOrientation(design.width_mm, design.height_mm, options.orientation);
    const doc = new jsPDF({
      unit: "mm",
      format: [design.width_mm, design.height_mm],
      orientation,
      compress: true,
    });
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    drawLabel(doc, design, rasters, (pw - design.width_mm) / 2, (ph - design.height_mm) / 2, options);
    return doc.output("blob");
  }

  const [pw0, ph0] = PAGE_MM[options.page];
  const orientation = resolveOrientation(design.width_mm, design.height_mm, options.orientation);
  const doc = new jsPDF({ unit: "mm", format: options.page, orientation, compress: true });
  const pw = orientation === "landscape" ? ph0 : pw0;
  const ph = orientation === "landscape" ? pw0 : ph0;

  const spec = options.spec ?? null;
  const margin = spec?.margin_mm ?? 8;
  const gapX = spec?.gap_x_mm ?? 3;
  const gapY = spec?.gap_y_mm ?? 3;
  const cols = Math.max(1, Math.floor((pw - margin * 2 + gapX) / (design.width_mm + gapX)));
  const rows = Math.max(1, Math.floor((ph - margin * 2 + gapY) / (design.height_mm + gapY)));

  const gridW = cols * design.width_mm + (cols - 1) * gapX;
  const gridH = rows * design.height_mm + (rows - 1) * gapY;
  const offsetX = (pw - gridW) / 2;
  const offsetY = (ph - gridH) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      drawLabel(
        doc,
        design,
        rasters,
        offsetX + c * (design.width_mm + gapX),
        offsetY + r * (design.height_mm + gapY),
        options,
      );
    }
  }
  return doc.output("blob");
}

export function slugifyName(name: string) {
  return (
    (name || "etiqueta")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "etiqueta"
  );
}

export async function downloadLabelPdf(design: LabelDesign, options: LabelPdfOptions) {
  const blob = await buildLabelPdfBlob(design, options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugifyName(design.name)}-${design.width_mm}x${design.height_mm}mm.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
