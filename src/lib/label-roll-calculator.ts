// Etiquetas por rolo ⇄ metragem do rolo — funções puras.
export const DEFAULT_GAP_MM = 3;

const cols = (c: number) => Math.max(1, Math.floor(c) || 1);

/** Metros de rolo necessários para N etiquetas. */
export function rollLengthForLabels(heightMm: number, gapMm: number, columns: number, quantity: number) {
  const step = Math.max(0, heightMm) + Math.max(0, gapMm);
  const rows = Math.ceil(Math.max(0, quantity) / cols(columns));
  return { stepMm: step, rows, meters: (rows * step) / 1000 };
}

/** Quantas etiquetas cabem num rolo de X metros. */
export function labelsForRollLength(heightMm: number, gapMm: number, columns: number, meters: number) {
  const step = Math.max(0, heightMm) + Math.max(0, gapMm);
  if (step <= 0 || meters <= 0) return { stepMm: step, rows: 0, labels: 0 };
  const rows = Math.floor((meters * 1000) / step);
  return { stepMm: step, rows, labels: rows * cols(columns) };
}
