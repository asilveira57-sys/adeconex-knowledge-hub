import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Plus, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateProductSeo,
  upsertProductRedirect,
  deleteProductRedirect,
} from "@/lib/admin.product.functions";
import { BASE_URL } from "@/lib/seo";
import { CharCounter, Field, TextAreaField, nullable, str, useInvalidateProduct } from "./fields";

type Redirect = { id: string; old_url: string; new_url: string; is_active: boolean | null; hits: number | null };

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

export function SeoTab({
  product,
  images,
  redirects,
}: {
  product: any;
  images: Array<{ alt_text: string | null }>;
  redirects: Redirect[];
}) {
  const save = useServerFn(updateProductSeo);
  const invalidate = useInvalidateProduct(product.id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    seo_title: str(product.seo_title),
    seo_description: str(product.seo_description),
    seo_keywords: str(product.seo_keywords),
    canonical_url: `${BASE_URL}/produto/${str(product.slug)}`,
    indexable: true,
  });
  const set = (k: keyof typeof form, v: string | boolean) => setForm((s) => ({ ...s, [k]: v as never }));

  const commercialText = stripHtml(str(product.commercial_description));
  const checks = [
    { label: "Título SEO entre 30 e 60 caracteres", ok: form.seo_title.length >= 30 && form.seo_title.length <= 60 },
    { label: "Meta description entre 80 e 160 caracteres", ok: form.seo_description.length >= 80 && form.seo_description.length <= 160 },
    { label: "Palavras-chave preenchidas", ok: form.seo_keywords.trim().length > 0 },
    { label: "Descrição comercial com 300+ caracteres", ok: commercialText.length >= 300 },
    { label: "Pelo menos uma imagem com texto alternativo", ok: images.some((i) => (i.alt_text ?? "").trim().length > 0) },
    { label: "Slug limpo (sem números soltos ou underscores)", ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(str(product.slug)) },
    { label: "Preço definido (rich snippet de produto)", ok: product.price != null },
  ];
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100);

  async function onSave() {
    setSaving(true);
    try {
      await save({
        data: {
          productId: product.id,
          seo_title: nullable(form.seo_title),
          seo_description: nullable(form.seo_description),
          seo_keywords: nullable(form.seo_keywords),
          canonical_url: nullable(form.canonical_url),
          indexable: form.indexable,
        },
      });
      await invalidate();
      toast.success("SEO salvo");
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
          <CardTitle className="text-sm">Metadados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Field label="Título SEO" value={form.seo_title} onChange={(v) => set("seo_title", v)} maxLength={200} />
            <CharCounter value={form.seo_title} max={60} />
          </div>
          <div>
            <TextAreaField
              label="Meta description"
              value={form.seo_description}
              onChange={(v) => set("seo_description", v)}
              rows={3}
              maxLength={400}
            />
            <CharCounter value={form.seo_description} max={160} />
          </div>
          <Field
            label="Palavras-chave"
            value={form.seo_keywords}
            onChange={(v) => set("seo_keywords", v)}
            hint="Separe por vírgula. Usadas no JSON-LD e nas metatags."
          />
          <Field label="URL canônica" value={form.canonical_url} onChange={(v) => set("canonical_url", v)} />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.indexable}
              onChange={(e) => set("indexable", e.target.checked)}
              className="h-4 w-4"
            />
            Permitir indexação nos buscadores
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Search className="h-4 w-4" /> Prévia no Google
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border p-4">
            <p className="text-xs text-muted-foreground">{BASE_URL}/produto/{str(product.slug)}</p>
            <p className="mt-1 text-lg text-[#1a0dab]">{form.seo_title || product.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {form.seo_description || str(product.short_description) || "Sem descrição definida."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Saúde SEO — {score}%</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full ${score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-destructive"}`}
              style={{ width: `${score}%` }}
            />
          </div>
          <ul className="space-y-1 text-sm">
            {checks.map((c) => (
              <li key={c.label} className={c.ok ? "text-emerald-600" : "text-muted-foreground"}>
                {c.ok ? "✓" : "○"} {c.label}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar SEO
      </Button>

      <RedirectsCard productId={product.id} slug={str(product.slug)} redirects={redirects} />
    </div>
  );
}

function RedirectsCard({
  productId,
  slug,
  redirects,
}: {
  productId: string;
  slug: string;
  redirects: Redirect[];
}) {
  const upsert = useServerFn(upsertProductRedirect);
  const remove = useServerFn(deleteProductRedirect);
  const invalidate = useInvalidateProduct(productId);
  const [rows, setRows] = useState(
    redirects.map((r) => ({ id: r.id as string | undefined, old_url: r.old_url, new_url: r.new_url, hits: r.hits ?? 0 })),
  );
  const [busy, setBusy] = useState<string | null>(null);

  function update(idx: number, patch: Partial<(typeof rows)[number]>) {
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function saveRow(idx: number) {
    const r = rows[idx];
    if (!r.old_url.trim() || !r.new_url.trim()) return toast.error("Preencha as duas URLs");
    setBusy(r.id ?? `new-${idx}`);
    try {
      const res = await upsert({
        data: { productId, id: r.id, old_url: r.old_url.trim(), new_url: r.new_url.trim(), is_active: true },
      });
      if (!r.id) update(idx, { id: res.id });
      await invalidate();
      toast.success("Redirect salvo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removeRow(idx: number) {
    const r = rows[idx];
    if (!r.id) return setRows((rs) => rs.filter((_, i) => i !== idx));
    setBusy(r.id);
    try {
      await remove({ data: { id: r.id } });
      setRows((rs) => rs.filter((_, i) => i !== idx));
      await invalidate();
      toast.success("Redirect removido");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Redirects 301 deste produto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">Nenhum redirect cadastrado.</p>}
        {rows.map((r, idx) => (
          <div key={r.id ?? `new-${idx}`} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="URL antiga" value={r.old_url} onChange={(v) => update(idx, { old_url: v })} />
            <Field label="URL nova" value={r.new_url} onChange={(v) => update(idx, { new_url: v })} hint={`${r.hits} acesso(s)`} />
            <div className="flex gap-1">
              <Button size="sm" onClick={() => saveRow(idx)} disabled={busy != null}>
                {busy === (r.id ?? `new-${idx}`) && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Salvar
              </Button>
              <Button size="sm" variant="outline" onClick={() => removeRow(idx)} disabled={busy != null}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRows((rs) => [...rs, { id: undefined, old_url: "", new_url: `/produto/${slug}`, hits: 0 }])}
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar redirect
        </Button>
      </CardContent>
    </Card>
  );
}
