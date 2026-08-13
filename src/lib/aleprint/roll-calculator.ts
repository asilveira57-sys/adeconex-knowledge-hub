// Motor de cálculo para o Planner de Bobina — função pura, sem dependências externas.
//
// v2 (migração adeconex-knowledge-hub):
//  - CORREÇÃO: `usagePercent` agora é medido sobre o material REALMENTE CONSUMIDO,
//    não sobre a bobina inteira. Antes, cortar 5 m de uma bobina de 50 m com encaixe
//    perfeito mostrava ~10% de aproveitamento. `usagePercentRoll` mantém a leitura antiga.
//  - CORREÇÃO: o campo `lateralWaste` do resultado (que na verdade devolvia
//    margens + perda) foi renomeado para `unusableWidth`, sem ambiguidade.
//  - `wastedArea` passa a ser a sobra dentro do trecho consumido.

export interface RollInput {
  // Bobina
  rollWidth: number;       // mm (largura da bobina)
  rollLength: number;      // metros (comprimento)
  materialType: string;    // tipo do material
  // Saída
  outputWidth: number;     // mm
  outputHeight: number;    // mm
  // Produção
  lateralMargin: number;   // mm (margem lateral, dos dois lados)
  lateralWaste: number;    // mm (perda lateral fixa do material)
  spacing: number;         // mm (espaçamento entre itens)
  orientation: 'normal' | 'rotacionado' | 'auto';
}

export interface RollResult {
  totalItems: number;
  itemsPerRow: number;
  totalRows: number;
  consumedLength: number;    // mm consumidos no comprimento
  consumedLengthM: number;   // metros consumidos
  /** Largura da bobina que não pode ser usada: margens (x2) + perda lateral. */
  unusableWidth: number;     // mm
  /** Aproveitamento sobre o trecho consumido — a métrica útil de produção. */
  usagePercent: number;
  /** Aproveitamento sobre a bobina inteira (contando o rolo que sobrou). */
  usagePercentRoll: number;
  /** Sobra dentro do trecho consumido. */
  wastedArea: number;        // mm²
  bestOrientation: 'normal' | 'rotacionado';
  usableWidth: number;       // mm
  rollLengthMm: number;      // mm total da bobina
  usedArea: number;          // mm²
  consumedArea: number;      // mm² (largura da bobina × comprimento consumido)
  rollArea: number;          // mm²
  /** Sobra de bobina não utilizada, em metros. */
  remainingLengthM: number;
}

function calcRollGrid(
  usableW: number,
  rollLenMm: number,
  outW: number,
  outH: number,
  spacing: number
): { itemsPerRow: number; totalRows: number; total: number; consumed: number } {
  if (outW <= 0 || outH <= 0 || usableW <= 0 || rollLenMm <= 0) {
    return { itemsPerRow: 0, totalRows: 0, total: 0, consumed: 0 };
  }
  // N itens ocupam N*out + (N-1)*spacing  =>  N <= (disponível + spacing) / (out + spacing)
  const itemsPerRow = Math.max(0, Math.floor((usableW + spacing) / (outW + spacing)));
  const totalRows = Math.max(0, Math.floor((rollLenMm + spacing) / (outH + spacing)));
  const total = itemsPerRow * totalRows;
  // Comprimento realmente consumido: sem o espaçamento depois da última linha
  const consumed = totalRows > 0 ? totalRows * outH + (totalRows - 1) * spacing : 0;
  return { itemsPerRow, totalRows, total, consumed: Math.max(0, consumed) };
}

export function calculateRollLayout(input: RollInput): RollResult {
  const {
    rollWidth, rollLength,
    outputWidth, outputHeight,
    lateralMargin, lateralWaste, spacing,
    orientation,
  } = input;

  const usableW = Math.max(0, rollWidth - lateralMargin * 2 - lateralWaste);
  const rollLenMm = rollLength * 1000;

  const normal = calcRollGrid(usableW, rollLenMm, outputWidth, outputHeight, spacing);
  const rotated = calcRollGrid(usableW, rollLenMm, outputHeight, outputWidth, spacing);

  let best: typeof normal & { ori: 'normal' | 'rotacionado' };

  if (orientation === 'normal') {
    best = { ...normal, ori: 'normal' };
  } else if (orientation === 'rotacionado') {
    best = { ...rotated, ori: 'rotacionado' };
  } else {
    best = rotated.total > normal.total
      ? { ...rotated, ori: 'rotacionado' }
      : { ...normal, ori: 'normal' };
  }

  const rollArea = rollWidth * rollLenMm;
  const consumedArea = rollWidth * best.consumed;
  const singleItemArea = outputWidth * outputHeight;
  const usedArea = best.total * singleItemArea;

  // Sobra dentro do que foi efetivamente consumido (é isso que vira refugo)
  const wastedArea = Math.max(0, consumedArea - usedArea);

  const usagePercent = consumedArea > 0 ? (usedArea / consumedArea) * 100 : 0;
  const usagePercentRoll = rollArea > 0 ? (usedArea / rollArea) * 100 : 0;

  return {
    totalItems: best.total,
    itemsPerRow: best.itemsPerRow,
    totalRows: best.totalRows,
    consumedLength: best.consumed,
    consumedLengthM: Math.round((best.consumed / 1000) * 100) / 100,
    unusableWidth: rollWidth - usableW,
    usagePercent: Math.round(usagePercent * 100) / 100,
    usagePercentRoll: Math.round(usagePercentRoll * 100) / 100,
    wastedArea: Math.round(wastedArea),
    bestOrientation: best.ori,
    usableWidth: usableW,
    rollLengthMm: rollLenMm,
    usedArea: Math.round(usedArea),
    consumedArea: Math.round(consumedArea),
    rollArea,
    remainingLengthM: Math.round(((rollLenMm - best.consumed) / 1000) * 100) / 100,
  };
}
