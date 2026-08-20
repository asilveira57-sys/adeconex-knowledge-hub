import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { buildMatrix, renderSvg, DEFAULT_STYLE } from "@/lib/qr/render";
import { shapeRadiusCss, type LabelDesign, type LabelLayer } from "@/lib/labels/shared";

/** 1 pt = 0,3528 mm */
const PT_TO_MM = 25.4 / 72;

type Props = {
  design: LabelDesign;
  /** pixels por milímetro */
  scale: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number) => void;
  /** margem de segurança (mm) exibida como guia tracejada */
  safeMarginMm?: number;
  className?: string;
};


export function LabelCanvas({ design, scale, selectedId, onSelect, onMove, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; startX: number; startY: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!onMove) return;
    function onPointerMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      onMove!(d.id, round(d.ox + dx), round(d.oy + dy));
    }
    function onPointerUp() {
      drag.current = null;
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onMove, scale]);

  return (
    <div
      ref={ref}
      onPointerDown={(e) => {
        if (e.target === ref.current) onSelect?.(null);
      }}
      className={cn("relative overflow-hidden rounded-sm border hairline shadow-card", className)}
      style={{
        width: design.width_mm * scale,
        height: design.height_mm * scale,
        background: design.background_color,
      }}
    >
      {design.layout.map((layer) => (
        <div
          key={layer.id}
          onPointerDown={(e) => {
            e.stopPropagation();
            onSelect?.(layer.id);
            if (onMove) {
              drag.current = { id: layer.id, startX: e.clientX, startY: e.clientY, ox: layer.x, oy: layer.y };
            }
          }}
          className={cn(
            "absolute",
            onMove && "cursor-move",
            selectedId === layer.id && "outline outline-2 outline-primary outline-offset-1",
          )}
          style={{
            left: layer.x * scale,
            top: layer.y * scale,
            width: layer.w * scale,
            transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
            transformOrigin: "top left",
          }}
        >
          <LayerContent layer={layer} scale={scale} color={design.ribbon_color} />
        </div>
      ))}
    </div>
  );
}

function round(v: number) {
  return Math.round(v * 10) / 10;
}

function LayerContent({ layer, scale, color }: { layer: LabelLayer; scale: number; color: string }) {
  if (layer.kind === "text") {
    return (
      <span
        className="block whitespace-pre-wrap leading-tight select-none"
        style={{
          color,
          fontFamily: layer.fontFamily,
          fontSize: layer.fontSize * PT_TO_MM * scale,
          fontWeight: layer.bold ? 700 : 400,
          fontStyle: layer.italic ? "italic" : "normal",
          textAlign: layer.align,
          letterSpacing: `${layer.letterSpacing * PT_TO_MM * scale}px`,
        }}
      >
        {layer.text}
      </span>
    );
  }

  if (layer.kind === "image") {
    return (
      <img
        src={layer.dataUrl}
        alt=""
        draggable={false}
        className="block h-full w-full object-contain select-none"
        style={{ height: layer.h * scale, filter: "grayscale(1) contrast(1.4)" }}
      />
    );
  }

  if (layer.kind === "qrcode") {
    return <QrLayer value={layer.value} size={layer.w * scale} color={color} />;
  }

  return (
    <BarcodeLayer
      value={layer.value}
      symbology={layer.symbology}
      showText={layer.showText}
      width={layer.w * scale}
      height={layer.h * scale}
      color={color}
    />
  );
}

function QrLayer({ value, size, color }: { value: string; size: number; color: string }) {
  const svg = useMemo(() => {
    try {
      const matrix = buildMatrix(value || " ", "M");
      return renderSvg(matrix, { ...DEFAULT_STYLE, fgColor: color, markerOuterColor: color, markerInnerColor: color, transparent: true, margin: 1 });
    } catch {
      return null;
    }
  }, [value, color]);

  if (!svg) {
    return <div className="flex items-center justify-center text-[10px] text-muted-foreground" style={{ width: size, height: size }}>QR inválido</div>;
  }
  return <div style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function BarcodeLayer({
  value,
  symbology,
  showText,
  width,
  height,
  color,
}: {
  value: string;
  symbology: string;
  showText: boolean;
  width: number;
  height: number;
  color: string;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancel = false;
    setFailed(false);
    (async () => {
      try {
        const { renderBarcodeSvg } = await import("@/lib/barcode/render");
        const res = await renderBarcodeSvg({
          symbology: symbology as never,
          value: value || "0000",
          xdim: 0.33,
          barHeight: 12,
          quietZone: 1,
          showText,
          textPosition: "below",
          textSize: 8,
          textFont: "Helvetica",
          barColor: color,
          bgColor: "#ffffff",
          transparent: true,
          rotation: 0,
        });
        if (!cancel) setSvg(res.svg.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="100%"'));
      } catch {
        if (!cancel) {
          setSvg(null);
          setFailed(true);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [value, symbology, showText, color]);

  if (failed) {
    return (
      <div
        className="flex items-center justify-center rounded-sm border border-dashed text-[10px] text-muted-foreground"
        style={{ width, height }}
      >
        Código inválido
      </div>
    );
  }

  return (
    <div style={{ width, height }} dangerouslySetInnerHTML={{ __html: svg ?? "" }} />
  );
}
