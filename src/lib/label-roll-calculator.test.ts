import { describe, expect, it } from "vitest";
import { labelsForRollLength, rollLengthForLabels } from "./label-roll-calculator";

describe("label roll calculator", () => {
  it("1000 etiquetas de 50 mm, 1 coluna, 3 mm = 53 m", () => {
    expect(rollLengthForLabels(50, 3, 1, 1000).meters).toBeCloseTo(53);
  });
  it("rolo de 50 m com etiqueta de 50 mm, 1 coluna = 943 etiquetas", () => {
    expect(labelsForRollLength(50, 3, 1, 50).labels).toBe(943);
  });
  it("2 colunas dobram as etiquetas do rolo", () => {
    expect(labelsForRollLength(50, 3, 2, 50).labels).toBe(1886);
  });
});
