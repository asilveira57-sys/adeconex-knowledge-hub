// Cálculo de consumo de ribbon — função pura, reaproveitável (ex.: páginas de produto).

export const RIBBON_SPACING_MM = 3;
export const PRINTER_USABLE_WIDTH_MM = 104; // impressoras de 4" (109 mm de boca)
export const RIBBON_ROLLS_M = [74, 90, 300, 450];

export interface RibbonPreset {
  label: string;
  widthMm: number;
  heightMm: number;
  columns: number;
}

export const RIBBON_PRESETS: RibbonPreset[] = [
  { label: "100×150 (envio)", widthMm: 100, heightMm: 150, columns: 1 },
  { label: "100×50", widthMm: 100, heightMm: 50, columns: 1 },
  { label: "100×100", widthMm: 100, heightMm: 100, columns: 1 },
  { label: "60×40", widthMm: 60, heightMm: 40, columns: 1 },
  { label: "50×30 · 2 col.", widthMm: 50, heightMm: 30, columns: 2 },
  { label: "40×25 · 2 col.", widthMm: 40, heightMm: 25, columns: 2 },
  { label: "33×22 · 3 col.", widthMm: 33, heightMm: 22, columns: 3 },
  { label: "30×15 · 3 col.", widthMm: 30, heightMm: 15, columns: 3 },
];

export interface RibbonInput {
  heightMm: number;
  quantity: number;
  columns: number;
  safetyPercent?: number;
}

export function ribbonConsumption({ heightMm, quantity, columns, safetyPercent = 0 }: RibbonInput) {
  const cols = Math.max(1, Math.floor(columns) || 1);
  const stepMm = Math.max(0, heightMm) + RIBBON_SPACING_MM;
  const rowsNeeded = Math.ceil(Math.max(0, quantity) / cols);
  const baseM = (stepMm * Math.max(0, quantity)) / cols / 1000;
  const totalM = baseM * (1 + Math.max(0, safetyPercent) / 100);
  return { stepMm, columns: cols, rowsNeeded, baseM, totalM };
}

export function rollYield(rollM: number, totalM: number, stepMm: number, columns: number, labelsPerLabelRoll?: number) {
  const labelsPerRibbon = stepMm > 0 ? Math.floor((rollM * 1000) / stepMm) * Math.max(1, columns) : 0;
  const runs = totalM > 0 ? rollM / totalM : 0;
  const leftoverM = rollM - totalM;
  const rollsNeeded = totalM > 0 ? Math.ceil(totalM / rollM) : 0;
  const labelRolls =
    labelsPerLabelRoll && labelsPerLabelRoll > 0 ? labelsPerRibbon / labelsPerLabelRoll : null;
  return { rollM, labelsPerRibbon, runs, leftoverM, rollsNeeded, labelRolls };
}

export function widthCheck(widthMm: number, columns: number) {
  const cols = Math.max(1, Math.floor(columns) || 1);
  const totalMm = widthMm * cols + (cols - 1) * RIBBON_SPACING_MM;
  return { totalMm, fits: totalMm <= PRINTER_USABLE_WIDTH_MM };
}
