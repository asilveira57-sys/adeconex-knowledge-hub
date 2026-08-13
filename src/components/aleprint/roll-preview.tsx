import { useMemo } from "react";
import type { RollInput, RollResult } from "@/lib/aleprint/roll-calculator";

const MAX_VISIBLE_ROWS = 12;

export function RollPreview({ input, result }: { input: RollInput; result: RollResult }) {
  const { rollWidth, spacing } = input;
  const { itemsPerRow, totalRows, usableWidth, bestOrientation } = result;

  const view = useMemo(() => {
    const isRotated = bestOrientation === "rotacionado";
    const outW = isRotated ? input.outputHeight : input.outputWidth;
    const outH = isRotated ? input.outputWidth : input.outputHeight;

    const visibleRows = Math.min(totalRows, MAX_VISIBLE_ROWS);
    const totalVisibleH = visibleRows > 0 ? visibleRows * outH + (visibleRows - 1) * spacing : outH;
    const lateralPad = (rollWidth - usableWidth) / 2;

    const scale = Math.min(480 / (rollWidth || 1), 400 / (totalVisibleH || 1));
    const sw = rollWidth * scale;
    const sh = totalVisibleH * scale;
    const mLeft = lateralPad * scale;
    const pw = outW * scale;
    const ph = outH * scale;
    const sp = spacing * scale;

    const pieces: { x: number; y: number; w: number; h: number }[] = [];
    for (let r = 0; r < visibleRows; r++) {
      for (let c = 0; c < itemsPerRow; c++) {
        pieces.push({ x: mLeft + c * (pw + sp), y: r * (ph + sp), w: pw, h: ph });
      }
    }
    return { sw, sh, mLeft, pieces };
  }, [
    rollWidth,
    spacing,
    input.outputWidth,
    input.outputHeight,
    totalRows,
    itemsPerRow,
    usableWidth,
    bestOrientation,
  ]);

  const { sw, sh, mLeft, pieces } = view;

  if (!Number.isFinite(sw) || sw <= 0 || sh <= 0) {
    return <p className="p-6 text-sm text-muted-foreground">Informe as medidas da bobina.</p>;
  }

  return (
    <div className="flex items-center justify-center p-4">
      <svg
        width={sw + 2}
        height={sh + 20}
        viewBox={`-1 -1 ${sw + 2} ${sh + 20}`}
        role="img"
        aria-label="Pré-visualização do aproveitamento da bobina"
        className="max-w-full drop-shadow-lg"
      >
        <rect x={0} y={0} width={sw} height={sh} className="fill-background stroke-border" strokeWidth={1} />
        <rect x={0} y={0} width={sw} height={sh} className="fill-destructive/10" />

        {mLeft > 0 && (
          <g className="stroke-muted-foreground/40" strokeWidth={0.5} strokeDasharray="4 2">
            <line x1={mLeft} y1={0} x2={mLeft} y2={sh} />
            <line x1={sw - mLeft} y1={0} x2={sw - mLeft} y2={sh} />
          </g>
        )}

        {pieces.map((p, i) => (
          <rect
            key={i}
            x={p.x}
            y={p.y}
            width={p.w}
            height={p.h}
            className="fill-primary/30 stroke-primary"
            strokeWidth={0.8}
            rx={1}
          />
        ))}

        {totalRows > MAX_VISIBLE_ROWS && (
          <text x={sw / 2} y={sh + 14} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
            ... +{totalRows - MAX_VISIBLE_ROWS} linhas
          </text>
        )}
      </svg>
    </div>
  );
}
