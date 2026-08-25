import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Save } from "lucide-react";
import {
  listSeoPagesAdmin,
  upsertSeoPageAdmin,
  deleteSeoPageAdmin,
} from "@/lib/seo-central.functions";
import { BASE_URL } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField, CharCounter } from "@/components/admin/product/fields";

export const Route = createFileRoute("/_authenticated/admin/seo/paginas")({
  head: () => ({ meta: [{ title: "SEO por Página — Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SeoPagesPage,
});

const ROBOTS_OPTIONS = ["index,follow", "index,nofollow", "noindex,follow", "noindex,nofollow"] as const;

type PageRow = {
  id: string;
  path: string | null;
  title: string;
  meta_description: string | null;
  keywords: string | null;
  canonical_url: string | null;
  indexable: boolean;
  robots_meta: string;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image: string | null;
  seo_priority: number | null;
  internal_notes: string | null;
};

const emptyForm = {
  id: undefined as string | undefined,
  path: "/",
  title: "",
  meta_description: "",
  keywords: "",
  canonical_url: "",
  indexable: true,
  robots_meta: "index,follow" as (typeof ROBOTS_OPTIONS)[number],
  og_title: "",
  og_description: "",
  og_image: "",
  twitter_title: "",
  twitter_description: "",
  twitter_image: "",
  seo_priority: "" as string,
  internal_notes: "",
};

function SeoPagesPage() {
  const queryClient = useQueryClient();
  const upsert = useServerFn(upsertSeoPageAdmin);
  const remove = useServerFn(deleteSeoPageAdmin);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "seo-pages"],
    queryFn: () => listSeoPagesAdmin(),
  });
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [saving, setSaving] = useState(false);

  const pages = (data?.pages ?? []) as unknown as PageRow[];

  function edit(p?: PageRow) {
    if (!p) return setForm({ ...emptyForm });
    setForm({
      id: p.id,
      path: p.path ?? "/",
      title: p.title ?? "",
      meta_description: p.meta_description ?? "",
      keywords: p.keywords ?? "",
      canonical_url: p.canonical_url ?? "",
      indexable: p.indexable,
      robots_meta: (ROBOTS_OPTIONS as readonly string[]).includes(p.robots_meta) ? (p.robots_meta as any) : "index,follow",
      og_title: p.og_title ?? "",
      og_description: p.og_description ?? "",
      og_image: p.og_image ?? "",
      twitter_title: p.twitter_title ?? "",
      twitter_description: p.twitter_description ?? "",
      twitter_image: p.twitter_image ?? "",
      seo_priority: p.seo_priority != null ? String(p.seo_priority) : "",
      internal_notes: p.internal_notes ?? "",
    });
  }

  async function onSave() {
    if (!form) return;
    if (!form.path.trim() || !form.title.trim()) return toast.error("Path e Meta Title são obrigatórios");
    setSaving(true);
    try {
      await upsert({
        data: {
          id: form.id,
          path: form.path.trim(),
          title: form.title.trim(),
          meta_description: form.meta_description || null,
          keywords: form.keywords || null,
          canonical_url: form.canonical_url || null,
          indexable: form.indexable,
          robots_meta: form.robots_meta,
          og_title: form.og_title || null,
          og_description: form.og_description || null,
          og_image: form.og_image || null,
          twitter_title: form.twitter_title || null,
          twitter_description: form.twitter_description || null,
          twitter_image: form.twitter_image || null,
          seo_priority: form.seo_priority ? Number(form.seo_priority) : null,
          internal_notes: form.internal_notes || null,
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "seo-pages"] });
      toast.success("Página salva");
      setForm(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    try {
      await remove({ data: { id } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "seo-pages"] });
      toast.success("Registro removido");
      if (form?.id === id) setForm(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const set = (k: keyof typeof emptyForm, v: any) => setForm((s) => (s ? { ...s, [k]: v } : s));

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">SEO por página</h1>
          <Button size="sm" onClick={() => edit()}>
            <Plus className="mr-1 h-3 w-3" /> Nova página
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cadastre overrides de SEO para páginas estáticas e institucionais. Produtos e categorias possuem SEO próprio no cadastro.
        </p>
        <div className="space-y-2">
          {pages.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Nenhuma página cadastrada ainda.
            </p>
          )}
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{p.path}</p>
                <p className="truncate text-xs text-muted-foreground">{p.title}</p>
                <p className={`text-xs ${p.indexable ? "text-emerald-600" : "text-amber-600"}`}>
                  {p.robots_meta}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => edit(p)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onDelete(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        {!form ? (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Selecione uma página para editar ou crie uma nova.
          </p>
        ) : (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Metadados</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="URL / Path" value={form.path} onChange={(v) => set("path", v)} hint="Ex.: /empresa" />
                <div>
                  <Field label="Meta Title" value={form.title} onChange={(v) => set("title", v)} maxLength={200} />
                  <CharCounter value={form.title} max={60} />
                </div>
                <div>
                  <TextAreaField label="Meta Description" value={form.meta_description} onChange={(v) => set("meta_description", v)} rows={3} maxLength={400} />
                  <CharCounter value={form.meta_description} max={160} />
                </div>
                <Field label="Meta Keywords (legado)" value={form.keywords} onChange={(v) => set("keywords", v)} />
                <Field label="Canonical URL" value={form.canonical_url} onChange={(v) => set("canonical_url", v)} hint={`Vazio = ${BASE_URL}${form.path}`} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-muted-foreground">Robots</span>
                    <select
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                      value={form.robots_meta}
                      onChange={(e) => set("robots_meta", e.target.value)}
                    >
                      {ROBOTS_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="Prioridade SEO (0.0–1.0)" value={form.seo_priority} onChange={(v) => set("seo_priority", v)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.indexable} onChange={(e) => set("indexable", e.target.checked)} className="h-4 w-4" />
                  Página indexável
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Open Graph / Twitter</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Field label="OG Title" value={form.og_title} onChange={(v) => set("og_title", v)} hint="Vazio = usa o Meta Title" />
                <TextAreaField label="OG Description" value={form.og_description} onChange={(v) => set("og_description", v)} rows={2} />
                <Field label="OG Image (URL)" value={form.og_image} onChange={(v) => set("og_image", v)} />
                <Field label="Twitter Title" value={form.twitter_title} onChange={(v) => set("twitter_title", v)} />
                <TextAreaField label="Twitter Description" value={form.twitter_description} onChange={(v) => set("twitter_description", v)} rows={2} />
                <Field label="Twitter Image (URL)" value={form.twitter_image} onChange={(v) => set("twitter_image", v)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Prévia no Google (simulação)</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border p-4">
                  <p className="text-xs text-muted-foreground">{BASE_URL}{form.path}</p>
                  <p className="mt-1 text-lg text-[#1a0dab]">{form.title || "Sem título"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{form.meta_description || "Sem descrição definida."}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Simulação visual aproximada — o Google pode exibir o resultado de forma diferente.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Notas internas</CardTitle></CardHeader>
              <CardContent>
                <TextAreaField label="" value={form.internal_notes} onChange={(v) => set("internal_notes", v)} rows={2} />
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button onClick={onSave} disabled={saving}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
