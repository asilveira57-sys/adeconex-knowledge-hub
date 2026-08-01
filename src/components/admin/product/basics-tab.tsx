import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateProductBasics } from "@/lib/admin.product.functions";
import { Field, SelectField, TextAreaField, nullable, str, useInvalidateProduct } from "./fields";

type Cat = { id: string; name: string; slug: string };

export function BasicsTab({
  product,
  allCategories,
  brands,
  categoryLinks,
}: {
  product: any;
  allCategories: Cat[];
  brands: Array<{ id: string; name: string }>;
  categoryLinks: Array<{ category_id: string; is_primary: boolean }>;
}) {
  const save = useServerFn(updateProductBasics);
  const invalidate = useInvalidateProduct(product.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: str(product.name),
    slug: str(product.slug),
    sku: str(product.sku),
    ean: str(product.ean),
    model: str(product.model),
    reference: str(product.reference),
    brand_id: str(product.brand_id),
    short_description: str(product.short_description),
  });
  const [selected, setSelected] = useState<string[]>(categoryLinks.map((c) => c.category_id));
  const [primary, setPrimary] = useState<string>(
    categoryLinks.find((c) => c.is_primary)?.category_id ?? str(product.category_id),
  );

  const set = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  function toggleCat(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function onSave() {
    if (form.name.trim().length < 2) return toast.error("Nome é obrigatório");
    setSaving(true);
    try {
      const res = await save({
        data: {
          productId: product.id,
          name: form.name.trim(),
          slug: form.slug.trim(),
          sku: nullable(form.sku),
          ean: nullable(form.ean),
          model: nullable(form.model),
          reference: nullable(form.reference),
          brand_id: form.brand_id || null,
          short_description: nullable(form.short_description),
          categoryIds: selected,
          primaryCategoryId: primary || null,
        },
      });
      if (res.slug !== form.slug) set("slug", res.slug);
      await invalidate();
      toast.success("Dados básicos salvos");
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
          <CardTitle className="text-sm">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome do produto" value={form.name} onChange={(v) => set("name", v)} maxLength={200} />
          <Field
            label="Slug (URL)"
            value={form.slug}
            onChange={(v) => set("slug", v)}
            hint="Ao mudar o slug criamos automaticamente um redirect 301 da URL antiga."
          />
          <Field label="SKU" value={form.sku} onChange={(v) => set("sku", v)} />
          <Field label="EAN" value={form.ean} onChange={(v) => set("ean", v)} />
          <Field label="Modelo" value={form.model} onChange={(v) => set("model", v)} />
          <Field label="Referência" value={form.reference} onChange={(v) => set("reference", v)} />
          <SelectField
            label="Marca"
            value={form.brand_id}
            onChange={(v) => set("brand_id", v)}
            options={[{ value: "", label: "— sem marca —" }, ...brands.map((b) => ({ value: b.id, label: b.name }))]}
          />
          <div className="sm:col-span-2">
            <TextAreaField
              label="Descrição curta"
              value={form.short_description}
              onChange={(v) => set("short_description", v)}
              rows={3}
              maxLength={600}
              hint="Resumo usado em cards do catálogo e nas prévias de busca."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Categorias</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="max-h-64 overflow-y-auto rounded-md border p-2">
            {allCategories.map((c) => (
              <label key={c.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50">
                <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleCat(c.id)} />
                <span className="flex-1">{c.name}</span>
                {selected.includes(c.id) && (
                  <button
                    type="button"
                    onClick={() => setPrimary(c.id)}
                    className={`rounded px-2 py-0.5 text-[11px] ${
                      primary === c.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {primary === c.id ? "Principal" : "Tornar principal"}
                  </button>
                )}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{selected.length} categoria(s) selecionada(s).</p>
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar dados básicos
      </Button>
    </div>
  );
}
