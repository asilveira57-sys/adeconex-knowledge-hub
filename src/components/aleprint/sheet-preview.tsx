import { useMemo } from "react";
import type { SheetInput, SheetResult } from "@/lib/aleprint/sheet-calculator";

/**
 * Preview SVG da folha.
 * A célula da grade (`pieceCellWidth`) posiciona; `pieceWidthWithBleed` desenha —
 * assim a última coluna nunca invade a margem.
 */
export function SheetPreview({ input, result }: { input: SheetInput; result: SheetResult }) {
  const { sheetWidth, sheetHeight, margin, includeBleed, bleed } = input;
  const {
    columns,
    rows,
    pieceCellWidth,
    pieceCellHeight,
    pieceWidthWithBleed,
    pieceHeightWithBleed,
    usableWidth,
    usableHeight,
    trianglePattern,
  } = result;

  const view = useMemo(() => {
    const scale = Math.min(480 / (sheetWidth || 1), 400 / (sheetHeight || 1));
    const sw = sheetWidth * scale;
    const sh = sheetHeight * scale;
    const m = margin * scale;
    const cellW = pieceCellWidth * scale;
    const cellH = pieceCellHeight * scale;
    const drawW = pieceWidthWithBleed * scale;
    const drawH = pieceHeightWithBleed * scale;
    const effectiveBleed = includeBleed ? bleed * scale : 0;

    const pieces: { x: number; y: number; w: number; h: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        pieces.push({ x: m + c * cellW, y: m + r * cellH, w: drawW, h: drawH });
      }
    }
    return { sw, sh, m, pieces, scale, effectiveBleed };
  }, [
    sheetWidth,
    sheetHeight,
    margin,
    columns,
    rows,
    pieceCellWidth,
    pieceCellHeight,
    pieceWidthWithBleed,
    pieceHeightWithBleed,
    includeBleed,
    bleed,
  ]);

  const { sw, sh, m, pieces, scale, effectiveBleed } = view;
  const isTriangle = input.shapeType === "triangulo";
  const isCircle = input.shapeType === "circulo";

  const triangles = useMemo(() => {
    if (!isTriangle || !trianglePattern) return null;
    const { upPerRow, downPerRow, rows: trows, baseMm, heightMm, stepX, stepY } = trianglePattern;
    const b = baseMm * scale;
    const h = heightMm * scale;
    const sx = stepX * scale;
    const sy = stepY * scale;
    const ups: string[] = [];
    const downs: string[] = [];
    for (let r = 0; r < trows; r++) {
      const y = m + r * sy;
      for (let c = 0; c < upPerRow; c++) {
        const x = m + c * sx;
        ups.push(`${x},${y + h} ${x + b / 2},${y} ${x + b},${y + h}`);
      }
      for (let c = 0; c < downPerRow; c++) {
        const x = m + c * sx + b / 2;
        downs.push(`${x},${y} ${x + b},${y} ${x + b / 2},${y + h}`);
      }
    }
    return { ups, downs };
  }, [isTriangle, trianglePattern, scale, m]);

  if (!Number.isFinite(sw) || sw <= 0 || sh <= 0) {
    return <p className="p-6 text-sm text-muted-foreground">Informe as medidas da folha.</p>;
  }

  return (
    <div className="flex items-center justify-center p-4">
      <svg
        width={sw + 2}
        height={sh + 2}
        viewBox={`-1 -1 ${sw + 2} ${sh + 2}`}
        role="img"
        aria-label="Pré-visualização do aproveitamento da folha"
        className="max-w-full drop-shadow-lg"
      >
        <rect x={0} y={0} width={sw} height={sh} className="fill-background stroke-border" strokeWidth={1} />
        <rect x={0} y={0} width={sw} height={sh} className="fill-destructive/10" />

        <rect
          x={m}
          y={m}
          width={usableWidth * scale}
          height={usableHeight * scale}
          fill="none"
          className="stroke-muted-foreground/40"
          strokeWidth={0.5}
          strokeDasharray="4 2"
        />

        {triangles ? (
          <g>
            {triangles.ups.map((pts, i) => (
              <polygon key={`u${i}`} points={pts} className="fill-primary/35 stroke-primary" strokeWidth={0.8} />
            ))}
            {triangles.downs.map((pts, i) => (
              <polygon key={`d${i}`} points={pts} className="fill-primary/20 stroke-primary" strokeWidth={0.8} />
            ))}
          </g>
        ) : (
          pieces.map((p, i) => {
            const innerX = p.x + effectiveBleed;
            const innerY = p.y + effectiveBleed;
            const innerW = Math.max(0, p.w - effectiveBleed * 2);
            const innerH = Math.max(0, p.h - effectiveBleed * 2);
            return (
              <g key={i}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  className="fill-primary/15 stroke-primary/30"
                  strokeWidth={0.5}
                />
                {isCircle ? (
                  <circle
                    cx={innerX + innerW / 2}
                    cy={innerY + innerH / 2}
                    r={Math.min(innerW, innerH) / 2}
                    className="fill-primary/35 stroke-primary"
                    strokeWidth={0.8}
                  />
                ) : isTriangle ? (
                  <polygon
                    points={`${innerX},${innerY + innerH} ${innerX + innerW / 2},${innerY} ${innerX + innerW},${innerY + innerH}`}
                    className="fill-primary/35 stroke-primary"
                    strokeWidth={0.8}
                  />
                ) : (
                  <rect
                    x={innerX}
                    y={innerY}
                    width={innerW}
                    height={innerH}
                    className="fill-primary/35 stroke-primary"
                    strokeWidth={0.8}
                    rx={1}
                  />
                )}
              </g>
            );
          })
        )}

        {m > 0 && (
          <g className="stroke-foreground/20" strokeWidth={0.5} strokeDasharray="2 2">
            <line x1={0} y1={m} x2={sw} y2={m} />
            <line x1={0} y1={sh - m} x2={sw} y2={sh - m} />
            <line x1={m} y1={0} x2={m} y2={sh} />
            <line x1={sw - m} y1={0} x2={sw - m} y2={sh} />
          </g>
        )}
      </svg>
    </div>
  );
}
