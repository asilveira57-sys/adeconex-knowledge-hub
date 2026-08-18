import { z } from "zod";

const rotation = z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]);
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida");

export const layerSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().max(40),
    kind: z.literal("text"),
    x: z.number(),
    y: z.number(),
    w: z.number().min(1).max(2000),
    text: z.string().max(300),
    fontSize: z.number().min(3).max(200),
    fontFamily: z.string().max(80),
    bold: z.boolean(),
    italic: z.boolean(),
    align: z.enum(["left", "center", "right"]),
    letterSpacing: z.number().min(-5).max(20),
    rotation,
  }),
  z.object({
    id: z.string().max(40),
    kind: z.literal("barcode"),
    x: z.number(),
    y: z.number(),
    w: z.number().min(1).max(2000),
    h: z.number().min(1).max(2000),
    symbology: z.string().max(40),
    value: z.string().max(300),
    showText: z.boolean(),
    rotation,
  }),
  z.object({
    id: z.string().max(40),
    kind: z.literal("qrcode"),
    x: z.number(),
    y: z.number(),
    w: z.number().min(1).max(2000),
    value: z.string().max(1200),
    rotation,
  }),
  z.object({
    id: z.string().max(40),
    kind: z.literal("image"),
    x: z.number(),
    y: z.number(),
    w: z.number().min(1).max(2000),
    h: z.number().min(1).max(2000),
    // imagem enviada pelo cliente, embutida como data URL (limite ~1,5 MB)
    dataUrl: z
      .string()
      .max(1_600_000)
      .regex(/^data:image\/(png|jpeg|webp|svg\+xml);base64,/, "Imagem inválida"),
    rotation,
  }),
]);

export const designInputSchema = z.object({
  id: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(1).max(80),
  base_product_id: z.string().uuid().nullable().optional(),
  width_mm: z.number().min(10).max(400),
  height_mm: z.number().min(10).max(400),
  material: z.string().max(40),
  ribbon_color: hex,
  background_color: hex,
  layout: z.array(layerSchema).max(40),
  thumbnail: z.string().max(400_000).nullable().optional(),
});

export type DesignInput = z.infer<typeof designInputSchema>;

export const addDesignToCartSchema = z.object({
  design_id: z.string().uuid(),
  quantity: z.number().int().min(100).max(200_000),
});
