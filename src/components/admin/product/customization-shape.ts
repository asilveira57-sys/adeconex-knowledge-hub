export type ShapeFields = {
  custom_shape: string;
  custom_width_mm: string;
  custom_height_mm: string;
};

export function updateShapeFields<T extends ShapeFields>(form: T, key: keyof ShapeFields, value: string): T {
  if (key === "custom_shape" && value === "square") {
    const side = form.custom_width_mm || form.custom_height_mm;
    return { ...form, custom_shape: value, custom_width_mm: side, custom_height_mm: side };
  }
  if (form.custom_shape === "square" && key !== "custom_shape") {
    return { ...form, custom_width_mm: value, custom_height_mm: value };
  }
  return { ...form, [key]: value };
}

export function storedShape(shape: string) {
  return shape === "square" ? "rect" : shape;
}

export function selectedShape(shape: string, width: unknown, height: unknown) {
  return shape === "rect" && Number(width) > 0 && Number(width) === Number(height) ? "square" : shape;
}