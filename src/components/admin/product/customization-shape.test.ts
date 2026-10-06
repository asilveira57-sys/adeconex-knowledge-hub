import { test, expect } from "bun:test";
import { selectedShape, storedShape, updateShapeFields } from "./customization-shape";

test("quadrado mantém largura e altura iguais ao escolher e editar qualquer medida", () => {
  const square = updateShapeFields({ custom_shape: "rect", custom_width_mm: "40", custom_height_mm: "25" }, "custom_shape", "square");
  expect(square.custom_height_mm).toBe("40");
  const resized = updateShapeFields(square, "custom_height_mm", "50");
  expect(resized.custom_width_mm).toBe("50");
  expect(resized.custom_height_mm).toBe("50");
  expect(updateShapeFields(resized, "custom_width_mm", "60").custom_height_mm).toBe("60");
});

test("quadrado salva como retângulo de lados iguais e é reconhecido ao reabrir", () => {
  expect(storedShape("square")).toBe("rect");
  expect(selectedShape("rect", 50, 50)).toBe("square");
  expect(selectedShape("rect", 50, 30)).toBe("rect");
  expect(selectedShape("rect", null, null)).toBe("rect");
});