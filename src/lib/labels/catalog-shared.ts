import type { LabelTemplate, LabelSize } from "@/lib/label-catalog.functions";
import { SHAPE_LABELS, type LabelDesign } from "@/lib/labels/shared";

export function templateToDesign(t: LabelTemplate): LabelDesign {
  return {
    id: null,
    name: t.name,
    base_product_id: null,
    width_mm: t.width_mm,
    height_mm: t.height_mm,
    shape: t.shape,
    corner_radius_mm: t.corner_radius_mm,
    material: t.material,
    ribbon_color: t.ribbon_color,
    background_color: t.background_color,
    layout: t.layout,
  } as LabelDesign;
}

const fmt = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export function sizeLabel(s: LabelSize) {
  const dims = s.shape === "circle" ? `Ø ${fmt(s.width_mm)} mm` : `${fmt(s.width_mm)} × ${fmt(s.height_mm)} mm`;
  return `${dims} · ${SHAPE_LABELS[s.shape] ?? s.shape}`;
}

/** Codifica uma medida para a URL do editor: 100x50-rect ou 85x55-rounded-3 */
export function sizeParam(s: LabelSize) {
  return `${s.width_mm}x${s.height_mm}-${s.shape}${s.corner_radius_mm != null ? `-${s.corner_radius_mm}` : ""}`;
}

export function parseSizeParam(v: string | undefined): LabelSize | null {
  if (!v) return null;
  const m = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)-(rect|rounded|circle|oval)(?:-(\d+(?:\.\d+)?))?$/.exec(v);
  if (!m) return null;
  return {
    width_mm: Number(m[1]),
    height_mm: Number(m[2]),
    shape: m[3] as LabelSize["shape"],
    corner_radius_mm: m[4] ? Number(m[4]) : null,
  };
}

export function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}
