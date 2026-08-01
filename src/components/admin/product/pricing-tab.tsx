import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, PackagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adjustStock, updateProductPricing } from "@/lib/admin.product.functions";
import {
  Field,
  SelectField,
  fromLocalInput,
  parseInt0,
  parseNum,
  str,
  toLocalInput,
  useInvalidateProduct,
} from "./fields";

export function PricingTab({ product }: { product: any }) {
  const save = useServerFn(updateProductPricing);
  const adjust = useServerFn(adjustStock);
  const invalidate = useInvalidateProduct(product.id);
  const [saving, setSaving] = useState(false);
  const [busyStock, setBusyStock] = useState(false);
  const [form, setForm] = useState({
    price: str(product.price),
    promotional_price: str(product.promotional_price),
    promo_starts_at: toLocalInput(product.promo_starts_at),
    promo_ends_at: toLocalInput(product.promo_ends_at),
    cost_price: str(product.cost_price),
    stock_quantity: str(product.stock_quantity),
    min_stock: str(product.min_stock),
    availability_status: str(product.availability_status) || "in_stock",
    is_available: !!product.is_available,
  });
  const [adjustForm, setAdjustForm] = useState({ mode: "add", amount: "" });

  const set = (k: keyof typeof form, v: string | boolean) => setForm((s) => ({ ...s, [k]: v as never }));

  const margin = (() => {
    const p = parseNum(form.promotional_price) ?? parseNum(form.price);
    const c = parseNum(form.cost_price);
    if (p == null || c == null || c <= 0) return null;
    return ((p - c) / p) * 100;
  })();

  async function onSave() {
    setSaving(true);
    try {
      await save({
        data: {
          productId: product.id,
          price: parseNum(form.price),
          promotional_price: parseNum(form.promotional_price),
          promo_starts_at: fromLocalInput(form.promo_starts_at),
          promo_ends_at: fromLocalInput(form.promo_ends_at),
          cost_price: parseNum(form.cost_price),
          stock_quantity: parseInt0(form.stock_quantity),
          min_stock: parseInt0(form.min_stock),
          availability_status: form.availability_status as any,
          is_available: form.is_available,
        },
      });
      await invalidate();
      toast.success("Preço e estoque salvos");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onAdjust() {
    const amount = parseInt0(adjustForm.amount);
    if (amount == null || amount < 0) return toast.error("Informe uma quantidade válida");
    setBusyStock(true);
    try {
      const res = await adjust({
        data: { productId: product.id, mode: adjustForm.mode as any, amount },
      });
      set("stock_quantity", String(res.stock_quantity));
      setAdjustForm((s) => ({ ...s, amount: "" }));
      await invalidate();
      toast.success(`Estoque atualizado para ${res.stock_quantity}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyStock(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Preço</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Field label="Preço (R$)" type="number" value={form.price} onChange={(v) => set("price", v)} />
          <Field
            label="Preço promocional (R$)"
            type="number"
            value={form.promotional_price}
            onChange={(v) => set("promotional_price", v)}
          />
          <Field
            label="Preço de custo (R$)"
            type="number"
            value={form.cost_price}
            onChange={(v) => set("cost_price", v)}
            hint={margin != null ? `Margem estimada: ${margin.toFixed(1)}%` : undefined}
          />
          <Field
            label="Promoção começa"
            type="datetime-local"
            value={form.promo_starts_at}
            onChange={(v) => set("promo_starts_at", v)}
          />
          <Field
            label="Promoção termina"
            type="datetime-local"
            value={form.promo_ends_at}
            onChange={(v) => set("promo_ends_at", v)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Estoque e disponibilidade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Estoque atual" type="number" value={form.stock_quantity} onChange={(v) => set("stock_quantity", v)} />
            <Field label="Estoque mínimo" type="number" value={form.min_stock} onChange={(v) => set("min_stock", v)} />
            <SelectField
              label="Disponibilidade"
              value={form.availability_status}
              onChange={(v) => set("availability_status", v)}
              options={[
                { value: "in_stock", label: "Em estoque" },
                { value: "out_of_stock", label: "Sem estoque" },
                { value: "preorder", label: "Pré-venda" },
                { value: "made_to_order", label: "Sob encomenda" },
                { value: "discontinued", label: "Descontinuado" },
              ]}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => set("is_available", e.target.checked)}
              className="h-4 w-4"
            />
            Produto ativo para venda na loja
          </label>

          <div className="rounded-md border p-3">
            <p className="mb-2 flex items-center gap-2 text-xs uppercase text-muted-foreground">
              <PackagePlus className="h-3.5 w-3.5" /> Ajuste rápido de estoque
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <SelectField
                label="Operação"
                value={adjustForm.mode}
                onChange={(v) => setAdjustForm((s) => ({ ...s, mode: v }))}
                options={[
                  { value: "add", label: "Somar" },
                  { value: "subtract", label: "Subtrair" },
                  { value: "set", label: "Definir" },
                ]}
              />
              <Field
                label="Quantidade"
                type="number"
                value={adjustForm.amount}
                onChange={(v) => setAdjustForm((s) => ({ ...s, amount: v }))}
              />
              <Button size="sm" variant="outline" onClick={onAdjust} disabled={busyStock}>
                {busyStock && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Aplicar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar preço e estoque
      </Button>
    </div>
  );
}
