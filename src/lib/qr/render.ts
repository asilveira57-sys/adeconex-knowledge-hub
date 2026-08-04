/**
 * Renderização do QR Code (matriz -> SVG -> PNG) 100% no navegador.
 */
import qrcode from "qrcode-generator";

export type EccLevel = "L" | "M" | "Q" | "H";
export type ModuleShape = "square" | "rounded" | "dots";
export type MarkerShape = "square" | "rounded" | "circle";

export type QrStyle = {
  fgColor: string;
  bgColor: string;
  transparent: boolean;
  markerOuterColor: string;
  markerInnerColor: string;
  moduleShape: ModuleShape;
  markerShape: MarkerShape;
  margin: number;
  ecc: EccLevel;
  logoDataUrl: string | null;
  logoSize: number; // fração da largura (0.12 - 0.28)
  logoPadding: number; // fração do lado do logo
  logoWhiteBg: boolean;
};

export const DEFAULT_STYLE: QrStyle = {
  fgColor: "#000000",
  bgColor: "#ffffff",
  transparent: false,
  markerOuterColor: "#000000",
  markerInnerColor: "#000000",
  moduleShape: "square",
  markerShape: "square",
  margin: 4,
  ecc: "M",
  logoDataUrl: null,
  logoSize: 0.2,
  logoPadding: 0.16,
  logoWhiteBg: true,
};

export type QrMatrix = { size: number; isDark: (r: number, c: number) => boolean };

export function buildMatrix(value: string, ecc: EccLevel): QrMatrix {
  // UTF-8 para acentuação correta em textos e vCards
  const factory = qrcode as unknown as {
    stringToBytes: unknown;
    stringToBytesFuncs: Record<string, unknown>;
  };
  if (factory.stringToBytesFuncs?.["UTF-8"]) {
    factory.stringToBytes = factory.stringToBytesFuncs["UTF-8"];
  }
  const qr = qrcode(0, ecc);
  qr.addData(value, "Byte");
  qr.make();
  const size = qr.getModuleCount();
  return { size, isDark: (r, c) => qr.isDark(r, c) };
}

const isFinderArea = (r: number, c: number, n: number) =>
  (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);

function escapeXml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function markerPath(x: number, y: number, shape: MarkerShape, outer: string, inner: string) {
  const rOuter = shape === "circle" ? 3.5 : shape === "rounded" ? 2 : 0;
  const rInner = shape === "circle" ? 1.5 : shape === "rounded" ? 0.9 : 0;
  return [
    `<rect x="${x}" y="${y}" width="7" height="7" rx="${rOuter}" ry="${rOuter}" fill="none" stroke="${outer}" stroke-width="1"/>`,
    `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${rInner}" ry="${rInner}" fill="${inner}"/>`,
  ].join("");
}

/** Gera o SVG completo (vetorial, com logo embutido e fundo opcionalmente transparente). */
export function renderSvg(matrix: QrMatrix, style: QrStyle): string {
  const n = matrix.size;
  const m = Math.max(0, Math.round(style.margin));
  const total = n + m * 2;
  const parts: string[] = [];

  if (!style.transparent) {
    parts.push(`<rect width="${total}" height="${total}" fill="${style.bgColor}"/>`);
  }

  const modules: string[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!matrix.isDark(r, c) || isFinderArea(r, c, n)) continue;
      const x = c + m;
      const y = r + m;
      if (style.moduleShape === "dots") {
        modules.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.46"/>`);
      } else if (style.moduleShape === "rounded") {
        modules.push(`<rect x="${x + 0.02}" y="${y + 0.02}" width="0.96" height="0.96" rx="0.32" ry="0.32"/>`);
      } else {
        modules.push(`<rect x="${x}" y="${y}" width="1.02" height="1.02"/>`);
      }
    }
  }
  parts.push(`<g fill="${style.fgColor}" shape-rendering="crispEdges">${modules.join("")}</g>`);

  parts.push(
    `<g>${[
      markerPath(m + 0.5, m + 0.5, style.markerShape, style.markerOuterColor, style.markerInnerColor),
      markerPath(m + n - 6.5, m + 0.5, style.markerShape, style.markerOuterColor, style.markerInnerColor),
      markerPath(m + 0.5, m + n - 6.5, style.markerShape, style.markerOuterColor, style.markerInnerColor),
    ].join("")}</g>`,
  );

  if (style.logoDataUrl) {
    const side = total * clampLogoSize(style.logoSize);
    const pad = side * style.logoPadding;
    const box = side + pad * 2;
    const bx = (total - box) / 2;
    if (style.logoWhiteBg) {
      parts.push(
        `<rect x="${bx}" y="${bx}" width="${box}" height="${box}" rx="${box * 0.12}" fill="#ffffff"/>`,
      );
    }
    parts.push(
      `<image x="${bx + pad}" y="${bx + pad}" width="${side}" height="${side}" preserveAspectRatio="xMidYMid meet" href="${escapeXml(
        style.logoDataUrl,
      )}"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" role="img">${parts.join(
    "",
  )}</svg>`;
}

export const clampLogoSize = (v: number) => Math.min(0.28, Math.max(0.1, v));

/** Converte um SVG em PNG na resolução pedida, preservando transparência. */
export async function svgToPngBlob(svg: string, size: number): Promise<Blob> {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponível neste navegador.");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Falha ao gerar o arquivo PNG.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível processar a imagem."));
    img.src = src;
  });
}

/* ───────── contraste ───────── */

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  const full = v.length === 3 ? v.split("").map((c) => c + c).join("") : v;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Tenta decodificar o QR gerado; retorna null quando não foi possível concluir o teste. */
export async function tryDecode(svg: string, expected: string): Promise<boolean | null> {
  try {
    const jsQR = (await import("jsqr")).default;
    const flat = svg.replace(
      /<svg([^>]*)>/,
      (_m, attrs: string) => `<svg${attrs}><rect width="100%" height="100%" fill="#ffffff"/>`,
    );
    const url = URL.createObjectURL(new Blob([flat], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const img = await loadImage(url);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 512, 512);
      ctx.drawImage(img, 0, 0, 512, 512);
      const data = ctx.getImageData(0, 0, 512, 512);
      const result = jsQR(data.data, data.width, data.height);
      if (!result) return false;
      return result.data === expected;
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}
