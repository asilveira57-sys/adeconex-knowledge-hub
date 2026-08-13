// Motor de cálculo para o Planner de Folha — função pura, sem dependências externas.
//
// v2 (migração adeconex-knowledge-hub):
//  - CORREÇÃO: a grade não cobra mais espaçamento depois da última peça.
//    Antes: floor(usable / (peça + espaço))  → perdia 1 coluna/linha em vários casos.
//    Agora: floor((usable + espaço) / (peça + espaço))  → mesmo critério do rollCalculator.
//  - `pieceCellWidth/Height` (célula = peça + sangria + espaço) e `pieceWidthWithBleed/HeightWithBleed`
//    (só peça + sangria) agora são devolvidos separados, para o preview desenhar sem estourar a margem.

export interface SheetInput {
  // Folha
  sheetWidth: number;   // mm
  sheetHeight: number;  // mm
  // Peça
  pieceWidth: number;   // mm
  pieceHeight: number;  // mm
  // Produção
  bleed: number;        // mm (sangria)
  spacing: number;      // mm (espaçamento)
  margin: number;       // mm (margem)
  // Opções
  allowRotation: boolean;
  includeBleed: boolean;
  shapeType: 'retangulo' | 'quadrado' | 'circulo' | 'triangulo';
  interlockTriangles?: boolean; // encaixe alternado (somente triângulo)
}

export interface SheetResult {
  totalPieces: number;
  columns: number;
  rows: number;
  usagePercent: number;
  wastedArea: number;             // mm²
  bestOrientation: 'normal' | 'rotacionado';
  /** Passo da grade: peça + sangria + espaçamento (mm). Use para posicionar. */
  pieceCellWidth: number;
  pieceCellHeight: number;
  /** Peça real desenhada: peça + sangria, sem espaçamento (mm). Use para desenhar. */
  pieceWidthWithBleed: number;
  pieceHeightWithBleed: number;
  usableWidth: number;
  usableHeight: number;
  sheetArea: number;
  usedArea: number;
  trianglePattern?: {
    upPerRow: number;
    downPerRow: number;
    rows: number;
    baseMm: number;     // base efetiva (com sangria), em mm
    heightMm: number;   // altura efetiva (com sangria), em mm
    stepX: number;      // passo horizontal entre triângulos "up" (= base + spacing)
    stepY: number;      // passo vertical entre faixas (= height + spacing)
  };
}

/**
 * Quantas peças de tamanho `piece` cabem em `usable`, sabendo que entre duas
 * peças consecutivas existe `spacing` — mas não depois da última.
 *   N peças ocupam: N * piece + (N - 1) * spacing
 *   =>  N <= (usable + spacing) / (piece + spacing)
 */
function fitCount(usable: number, piece: number, spacing: number): number {
  if (piece <= 0 || usable <= 0) return 0;
  return Math.max(0, Math.floor((usable + spacing) / (piece + spacing)));
}

function calcGrid(
  usableW: number,
  usableH: number,
  pieceW: number,
  pieceH: number,
  spacing: number
): { cols: number; rows: number; total: number } {
  const cols = fitCount(usableW, pieceW, spacing);
  const rows = fitCount(usableH, pieceH, spacing);
  return { cols, rows, total: cols * rows };
}

export function calculateSheetLayout(input: SheetInput): SheetResult {
  const {
    sheetWidth, sheetHeight,
    pieceWidth, pieceHeight,
    bleed, spacing, margin,
    allowRotation, includeBleed, shapeType,
    interlockTriangles,
  } = input;

  const effectiveBleed = includeBleed ? bleed : 0;

  // Área útil da folha
  const usableW = Math.max(0, sheetWidth - margin * 2);
  const usableH = Math.max(0, sheetHeight - margin * 2);

  // Tamanho da peça COM sangria (sem espaçamento embutido)
  let pw = pieceWidth + effectiveBleed * 2;
  let ph = pieceHeight + effectiveBleed * 2;

  // Para círculos, usar diâmetro (largura = altura)
  if (shapeType === 'circulo') {
    const diameter = Math.max(pieceWidth, pieceHeight);
    pw = diameter + effectiveBleed * 2;
    ph = pw;
  }

  // ===== Caminho especial: triângulo com encaixe alternado =====
  if (shapeType === 'triangulo' && interlockTriangles !== false) {
    const baseEff = pieceWidth + effectiveBleed * 2;
    const heightEff = pieceHeight + effectiveBleed * 2;

    const tryInterlock = (b: number, h: number) => {
      if (b <= 0 || h <= 0) return { up: 0, down: 0, rows: 0, total: 0, stepX: 0, stepY: 0, b, h };
      const stepX = b + spacing;        // passo horizontal entre "ups"
      const stepY = h + spacing;        // passo vertical entre faixas
      const up = Math.max(0, Math.floor((usableW - b) / stepX) + 1);
      // downs intercalam entre ups
      const down = up >= 2 ? up - 1 : 0;
      const rows = Math.max(0, Math.floor((usableH - h) / stepY) + 1);
      const total = rows * (up + down);
      return { up, down, rows, total, stepX, stepY, b, h };
    };

    const normal = tryInterlock(baseEff, heightEff);
    const rotated = allowRotation ? tryInterlock(heightEff, baseEff) : { ...normal, total: -1 };
    const best = rotated.total > normal.total
      ? { ...rotated, ori: 'rotacionado' as const }
      : { ...normal, ori: 'normal' as const };

    const sheetArea = sheetWidth * sheetHeight;
    const triangleArea = (best.b * best.h) / 2; // área real do triângulo
    const usedArea = best.total * triangleArea;
    const wastedArea = sheetArea - usedArea;
    const usagePercent = sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0;

    return {
      totalPieces: best.total,
      columns: best.up,
      rows: best.rows,
      usagePercent: Math.round(usagePercent * 100) / 100,
      wastedArea: Math.round(wastedArea * 100) / 100,
      bestOrientation: best.ori,
      pieceCellWidth: best.stepX,
      pieceCellHeight: best.stepY,
      pieceWidthWithBleed: best.b,
      pieceHeightWithBleed: best.h,
      usableWidth: usableW,
      usableHeight: usableH,
      sheetArea,
      usedArea: Math.round(usedArea * 100) / 100,
      trianglePattern: {
        upPerRow: best.up,
        downPerRow: best.down,
        rows: best.rows,
        baseMm: best.b,
        heightMm: best.h,
        stepX: best.stepX,
        stepY: best.stepY,
      },
    };
  }

  // Grade normal
  const normal = calcGrid(usableW, usableH, pw, ph, spacing);

  let best: { cols: number; rows: number; total: number; orientation: 'normal' | 'rotacionado' } = {
    ...normal,
    orientation: 'normal',
  };

  // Testar rotacionado (círculo não tem rotação útil)
  if (allowRotation && shapeType !== 'circulo') {
    const rotated = calcGrid(usableW, usableH, ph, pw, spacing);
    if (rotated.total > normal.total) {
      best = { ...rotated, orientation: 'rotacionado' as const };
    }
  }

  const sheetArea = sheetWidth * sheetHeight;

  // Área efetiva de cada peça (peça + sangria, sem espaçamento)
  let singlePieceArea = pw * ph;
  if (shapeType === 'triangulo') {
    singlePieceArea = (pw * ph) / 2;
  } else if (shapeType === 'circulo') {
    const r = pw / 2;
    singlePieceArea = Math.PI * r * r;
  }

  const usedArea = best.total * singlePieceArea;
  const wastedArea = sheetArea - usedArea;
  const usagePercent = sheetArea > 0 ? (usedArea / sheetArea) * 100 : 0;

  const isRotated = best.orientation === 'rotacionado';
  const drawnW = isRotated ? ph : pw;
  const drawnH = isRotated ? pw : ph;

  return {
    totalPieces: best.total,
    columns: best.cols,
    rows: best.rows,
    usagePercent: Math.round(usagePercent * 100) / 100,
    wastedArea: Math.round(wastedArea * 100) / 100,
    bestOrientation: best.orientation,
    pieceCellWidth: drawnW + spacing,
    pieceCellHeight: drawnH + spacing,
    pieceWidthWithBleed: drawnW,
    pieceHeightWithBleed: drawnH,
    usableWidth: usableW,
    usableHeight: usableH,
    sheetArea,
    usedArea: Math.round(usedArea * 100) / 100,
  };
}
