import { test } from "node:test";
import { strict as assert } from "node:assert";
import { selectedShape, storedShape, updateShapeFields } from "./customization-shape";

test("quadrado mantém largura e altura iguais ao escolher e editar qualquer medida", () => {
  const square = updateShapeFields({ custom_shape: "rect", custom_width_mm: "40", custom_height_mm: "25" }, "custom_shape", "square");
  assert.equal(square.custom_height_mm, "40");
  const resized = updateShapeFields(square, "custom_height_mm", "50");
  assert.equal(resized.custom_width_mm, "50");
  assert.equal(resized.custom_height_mm, "50");
  assert.equal(updateShapeFields(resized, "custom_width_mm", "60").custom_height_mm, "60");
});

test("quadrado salva como retângulo de lados iguais e é reconhecido ao reabrir", () => {
  assert.equal(storedShape("square"), "rect");
  assert.equal(selectedShape("rect", 50, 50), "square");
  assert.equal(selectedShape("rect", 50, 30), "rect");
  assert.equal(selectedShape("rect", null, null), "rect");
});