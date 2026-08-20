import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProductCustomization } from "@/lib/admin.product.functions";
import { Field, SelectField, TextAreaField, nullable, parseInt0, parseNum, str, useInvalidateProduct } from "./fields";
import { LabelMockup } from "@/components/labels/label-mockup";
import { emptyDesign, type LabelShape, type ProductLabelSpec } from "@/lib/labels/shared";

export function CustomizationTab({ product }: { product: any }) {
  const save = useServerFn(updateProductCustomization);
  const invalidate = useInvalidateProduct(product.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    is_customizable: !!product.is_customizable,
    custom_shape: str(product.custom_shape) || "rect",
    custom_width_mm: str(product.custom_width_mm),
    custom_height_mm: str(product.custom_height_mm),
    custom_corner_radius_mm: str(product.custom_corner_radius_mm),
    custom_columns: str(product.custom_columns ?? 1),
    custom_rows: str(product.custom_rows ?? 1),
    custom_gap_x_mm: str(product.custom_gap_x_mm ?? 3),
    custom_gap_y_mm: str(product.custom_gap_y_mm ?? 3),
    custom_margin_mm: str(product.custom_margin_mm ?? 2),
    custom_safe_margin_mm: str(product.custom_safe_margin_mm ?? 2),
    custom_notes: str(product.custom_notes),
  });

  const set = (k: keyof typeof form, v: string | boolean) =>
    setForm((s) => ({ ...s, [k]: v as never }));

  const spec: ProductLabelSpec = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    shape: (form.custom_shape as LabelShape) ?? "rect",
    width_mm: parseNum(form.custom_width_mm) ?? 100,
    height_mm: parseNum(form.custom_height_mm) ?? 50,
    corner_radius_mm: parseNum(form.custom_corner_radius_mm),
    columns: parseInt0(form.custom_columns) ?? 1,
    rows: parseInt0(form.custom_rows) ?? 1,
    gap_x_mm: parseNum(form.custom_gap_x_mm) ?? 0,
    gap_y_mm: parseNum(form.custom_gap_y_mm) ?? 0,
    margin_mm: parseNum(form.custom_margin_mm) ?? 0,
    safe_margin_mm: parseNum(form.custom_safe_margin_mm) ?? 0,
    notes: nullable(form.custom_notes),
  };

  const previewDesign = {
    ...emptyDesign(),
    width_mm: spec.width_mm,
    height_mm: spec.height_mm,
    shape: spec.shape,
    corner_radius_mm: spec.corner_radius_mm,
  };

  async function onSave() {
    setSaving(true);
    try {
      await save({
        data: {
          productId: product.id,
          is_customizable: form.is_customizable,
          custom_shape: form.custom_shape as LabelShape,
          custom_width_mm: parseNum(form.custom_width_mm),
          custom_height_mm: parseNum(form.custom_height_mm),
          custom_corner_radius_mm: parseNum(form.custom_corner_radius_mm),
          custom_columns: parseInt0(form.custom_columns) ?? 1,
          custom_rows: parseInt0(form.custom_rows) ?? 1,
          custom_gap_x_mm: parseNum(form.custom_gap_x_mm) ?? 0,
          custom_gap_y_mm: parseNum(form.custom_gap_y_mm) ?? 0,
          custom_margin_mm: parseNum(form.custom_margin_mm) ?? 0,
          custom_safe_margin_mm: parseNum(form.custom_safe_margin_mm) ?? 0,
          custom_notes: nullable(form.custom_notes),
        },
      });
      await invalidate();
      toast.success("Configuração de personalização salva");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Permite personalizar?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={form.is_customizable}
              onChange={(e) => set("is_customizable", e.target.checked)}
            />
            Este produto pode ser personalizado no editor de etiquetas
          </label>
          <p className="text-xs text-muted-foreground">
            Quando desmarcado, o botão “Personalizar esta etiqueta” não aparece na página do produto
            e a etiqueta não fica disponível no editor.
          </p>
        </CardContent>
      </Card>

      {form.is_customizable && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Formato e medidas da etiqueta</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <SelectField
                label="Formato"
                value={form.custom_shape}
                onChange={(v) => set("custom_shape", v)}
                options={[
                  { value: "rect", label: "Retangular" },
                  { value: "rounded", label: "Cantos arredondados" },
                  { value: "circle", label: "Redonda" },
                  { value: "oval", label: "Oval" },
                ]}
              />
              <Field
                label="Largura (mm)"
                type="number"
                value={form.custom_width_mm}
                onChange={(v) => set("custom_width_mm", v)}
              />
              <Field
                label="Altura (mm)"
                type="number"
                value={form.custom_height_mm}
                onChange={(v) => set("custom_height_mm", v)}
                hint={
                  form.custom_shape === "circle"
                    ? "Para etiqueta redonda use altura igual à largura (diâmetro)."
                    : undefined
                }
              />
              <Field
                label="Raio dos cantos (mm)"
                type="number"
                value={form.custom_corner_radius_mm}
                onChange={(v) => set("custom_corner_radius_mm", v)}
                hint="Usado no formato “cantos arredondados”."
              />
              <Field
                label="Margem de segurança (mm)"
                type="number"
                value={form.custom_safe_margin_mm}
                onChange={(v) => set("custom_safe_margin_mm", v)}
                hint="Guia tracejada no editor — evita corte de texto."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Disposição no material (bobina / folha)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <Field label="Colunas" type="number" value={form.custom_columns} onChange={(v) => set("custom_columns", v)} />
              <Field label="Linhas" type="number" value={form.custom_rows} onChange={(v) => set("custom_rows", v)} />
              <Field label="Margem da borda (mm)" type="number" value={form.custom_margin_mm} onChange={(v) => set("custom_margin_mm", v)} />
              <Field label="Espaço entre colunas (mm)" type="number" value={form.custom_gap_x_mm} onChange={(v) => set("custom_gap_x_mm", v)} />
              <Field label="Espaço entre linhas (mm)" type="number" value={form.custom_gap_y_mm} onChange={(v) => set("custom_gap_y_mm", v)} />
              <div className="sm:col-span-3">
                <TextAreaField
                  label="Observações de produção"
                  value={form.custom_notes}
                  onChange={(v) => set("custom_notes", v)}
                  rows={3}
                  maxLength={600}
                  hint="Aparece para o cliente no editor (ex.: “não use texto a menos de 3 mm da borda”)."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Prévia do mockup</CardTitle>
            </CardHeader>
            <CardContent>
              <LabelMockup design={previewDesign} spec={spec} />
            </CardContent>
          </Card>
        </>
      )}

      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar personalização
      </Button>
    </div>
  );
}
