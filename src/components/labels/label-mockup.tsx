import { LabelCanvas } from "@/components/labels/label-canvas";
import type { LabelDesign, ProductLabelSpec } from "@/lib/labels/shared";

/**
 * Mockup do material: mostra como a arte se repete na bobina/folha
 * conforme colunas, linhas e espaçamentos cadastrados no produto.
 */
export function LabelMockup({
  design,
  spec,
  maxWidth = 520,
  maxHeight = 300,
}: {
  design: LabelDesign;
  spec: ProductLabelSpec;
  maxWidth?: number;
  maxHeight?: number;
}) {
  const cols = Math.max(1, Math.min(12, spec.columns));
  const rows = Math.max(1, Math.min(12, spec.rows));
  const totalW = cols * design.width_mm + (cols - 1) * spec.gap_x_mm + spec.margin_mm * 2;
  const totalH = rows * design.height_mm + (rows - 1) * spec.gap_y_mm + spec.margin_mm * 2;
  const scale = Math.min(maxWidth / totalW, maxHeight / totalH, 6);

  return (
    <div className="space-y-2">
      <div
        className="mx-auto rounded-sm border border-dashed bg-surface-1"
        style={{
          width: totalW * scale,
          height: totalH * scale,
          padding: spec.margin_mm * scale,
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, ${design.width_mm * scale}px)`,
            gridTemplateRows: `repeat(${rows}, ${design.height_mm * scale}px)`,
            columnGap: spec.gap_x_mm * scale,
            rowGap: spec.gap_y_mm * scale,
          }}
        >
          {Array.from({ length: cols * rows }).map((_, i) => (
            <LabelCanvas key={i} design={design} scale={scale} />
          ))}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Mockup do material — {cols} coluna(s) × {rows} linha(s), espaço de {spec.gap_x_mm} mm entre
        colunas e {spec.gap_y_mm} mm entre linhas.
      </p>
    </div>
  );
}
