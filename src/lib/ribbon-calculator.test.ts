import { describe, expect, it } from "vitest";
import { labelsInRollLength, ribbonConsumption, rollYield, widthCheck } from "./ribbon-calculator";

describe("ribbon calculator", () => {
  it("1000 etiquetas de 50 mm em 1 coluna = 53 m", () => {
    expect(ribbonConsumption({ heightMm: 50, quantity: 1000, columns: 1 }).totalM).toBeCloseTo(53);
  });
  it("1000 etiquetas de 50 mm em 2 colunas = 26,5 m", () => {
    expect(ribbonConsumption({ heightMm: 50, quantity: 1000, columns: 2 }).totalM).toBeCloseTo(26.5);
  });
  it("sobra 47,5 m num rolo de 74 m", () => {
    expect(rollYield(74, 26.5, 53, 2).leftoverM).toBeCloseTo(47.5);
  });
  it("33x22 em 3 colunas ocupa 108 mm e cabe na boca de 109 mm", () => {
    expect(widthCheck(33, 3)).toEqual({ totalMm: 108, fits: true });
  });
  it("rolo de 50 m com etiqueta de 50 mm em 1 coluna tem 943 etiquetas", () => {
    expect(labelsInRollLength(50, 53, 1)).toBe(943);
  });
  it("3 colunas de 40 mm não cabem em 104 mm", () => {
    expect(widthCheck(40, 3).fits).toBe(false);
  });
});
