import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Eye, EyeOff, ImagePlus, Loader2, PenLine, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminDeleteLabelType,
  adminDeleteTemplate,
  adminGetLabelType,
  adminImportTemplateFromDesign,
  adminSaveLabelType,
  adminUpdateTemplate,
  type LabelType,
  type LabelSize,
} from "@/lib/label-catalog.functions";
import { listMyDesigns } from "@/lib/labels.functions";
import { sizeLabel, sizeParam, templateToDesign } from "@/lib/labels/catalog-shared";
import { SHAPE_LABELS, type LabelShape } from "@/lib/labels/shared";
import { LabelCanvas } from "@/components/labels/label-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/etiquetas/$id")({
  head: () => ({
    meta: [
      { title: "Editar tipo de etiqueta — Admin Adeconex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLabelTypeEdit,
});

const num = (v: string) => Number(v.replace(",", ".")) || 0;

function AdminLabelTypeEdit() {
  const { id } = Route.useParams();
  const getFn = useServerFn(adminGetLabelType);
  const saveFn = useServerFn(adminSaveLabelType);
  const delFn = useServerFn(adminDeleteLabelType);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["admin", "label-type", id], queryFn: () => getFn({ data: { id } }) });
  const [form, setForm] = useState<LabelType | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: (f: LabelType) => {
      const { updated_at: _u, ...rest } = f;
      return saveFn({ data: rest });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "label-types"] });
      qc.invalidateQueries({ queryKey: ["admin", "label-type", id] });
      toast.success("Tipo de etiqueta salvo");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: () => delFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "label-types"] });
      navigate({ to: "/admin/etiquetas" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isPending || !form) return <Loader2 className="h-5 w-5 animate-spin" />;
  if (!q.data) return <p>Tipo não encontrado.</p>;

  const set = <K extends keyof LabelType>(k: K, v: LabelType[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const setSize = (i: number, patch: Partial<LabelSize>) =>
    set("sizes", form.sizes.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  async function upload(file: File, target: "cover" | "blog") {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `label-types/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("catalog-media").upload(path, file, { contentType: file.type });
      if (error) throw error;
      const url = supabase.storage.from("catalog-media").getPublicUrl(path).data.publicUrl;
      if (target === "cover") set("cover_url", url);
      else set("blog_images", [...(form?.blog_images ?? []), { url, alt: form?.name ?? "" }]);
    } catch (e) {
      toast.error((e as Error).message || "Falha no envio da imagem");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/etiquetas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="h-4 w-4" /> Etiqueta personalizada
          </Link>
          <h1 className="mt-1 text-2xl font-semibold">{form.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={form.is_published} onCheckedChange={(v) => set("is_published", v)} /> Publicado
          </label>
          {q.data.is_published && (
            <Button asChild variant="outline" size="sm">
              <a href={`/etiquetas/personalizada/${q.data.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" /> Ver página
              </a>
            </Button>
          )}
          <Button onClick={() => save.mutate(form)} disabled={save.isPending || uploading}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </Button>
        </div>
      </div>

      <section className="grid gap-4 rounded-lg border bg-card p-5 md:grid-cols-2">
        <h2 className="font-semibold md:col-span-2">Dados do tipo</h2>
        <div><Label>Nome</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>Endereço da página (slug)</Label><Input value={form.slug} onChange={(e) => set("slug", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Descrição curta</Label><Input value={form.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} /></div>
        <div className="md:col-span-2"><Label>Para que serve</Label><Textarea rows={2} value={form.usage ?? ""} onChange={(e) => set("usage", e.target.value)} /></div>
        <div><Label>Ordem</Label><Input type="number" value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value) || 0)} /></div>
        <div>
          <Label>Foto de capa</Label>
          <div className="mt-1 flex items-center gap-3">
            {form.cover_url && <img src={form.cover_url} alt="" className="h-14 w-20 rounded object-cover" />}
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent">
              <ImagePlus className="h-4 w-4" /> {form.cover_url ? "Trocar" : "Enviar"}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "cover"); e.target.value = ""; }} />
            </label>
            {form.cover_url && <Button variant="ghost" size="sm" onClick={() => set("cover_url", null)}>Remover</Button>}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Medidas sugeridas</h2>
            <p className="text-xs text-muted-foreground">O cliente escolhe uma dessas medidas para começar a arte.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => set("sizes", [...form.sizes, { width_mm: 50, height_mm: 30, shape: "rect", corner_radius_mm: null }])}>
            <Plus className="h-4 w-4" /> Medida
          </Button>
        </div>
        {form.sizes.map((s, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="w-24"><Label className="text-xs">Largura (mm)</Label><Input inputMode="decimal" defaultValue={String(s.width_mm).replace(".", ",")} onBlur={(e) => setSize(i, { width_mm: num(e.target.value) })} /></div>
            <div className="w-24"><Label className="text-xs">Altura (mm)</Label><Input inputMode="decimal" defaultValue={String(s.height_mm).replace(".", ",")} onBlur={(e) => setSize(i, { height_mm: num(e.target.value) })} /></div>
            <div className="w-40">
              <Label className="text-xs">Formato</Label>
              <Select value={s.shape} onValueChange={(v) => setSize(i, { shape: v as LabelShape, corner_radius_mm: v === "rounded" ? s.corner_radius_mm ?? 3 : null })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SHAPE_LABELS) as LabelShape[]).map((k) => <SelectItem key={k} value={k}>{SHAPE_LABELS[k]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {s.shape === "rounded" && (
              <div className="w-24"><Label className="text-xs">Canto (mm)</Label><Input inputMode="decimal" defaultValue={String(s.corner_radius_mm ?? 3).replace(".", ",")} onBlur={(e) => setSize(i, { corner_radius_mm: num(e.target.value) })} /></div>
            )}
            <Button asChild variant="ghost" size="sm">
              <Link to="/etiquetas/editor" search={{ medida: sizeParam(s) }} target="_blank">
                <PenLine className="h-4 w-4" /> Criar arte nesta medida
              </Link>
            </Button>
            <Button variant="ghost" size="icon" disabled={form.sizes.length <= 1} onClick={() => set("sizes", form.sizes.filter((_, j) => j !== i))} aria-label="Remover medida">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </section>

      <TemplatesSection typeId={id} templates={q.data.templates} />

      <section className="grid gap-4 rounded-lg border bg-card p-5">
        <div>
          <h2 className="font-semibold">Post de blog</h2>
          <p className="text-xs text-muted-foreground">Aparece na página pública deste tipo. Parágrafos separados por uma linha em branco; uma dica por linha.</p>
        </div>
        <div><Label>Título do post</Label><Input value={form.blog_title ?? ""} onChange={(e) => set("blog_title", e.target.value)} /></div>
        <div><Label>Resumo</Label><Textarea rows={2} value={form.blog_excerpt ?? ""} onChange={(e) => set("blog_excerpt", e.target.value)} /></div>
        <div><Label>Texto: para que serve e como usar</Label><Textarea rows={10} value={form.blog_body ?? ""} onChange={(e) => set("blog_body", e.target.value)} /></div>
        <div><Label>Dicas de configuração</Label><Textarea rows={5} value={form.blog_tips ?? ""} onChange={(e) => set("blog_tips", e.target.value)} placeholder={"Use ribbon cera para papel couché\nAjuste a velocidade da impressora para 3 pol/s"} /></div>
        <div>
          <Label>Imagens do post</Label>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {form.blog_images.map((img, i) => (
              <div key={img.url} className="space-y-1 rounded border p-2">
                <img src={img.url} alt={img.alt} className="h-28 w-full rounded object-cover" />
                <Input value={img.alt} placeholder="Descrição da imagem (SEO)" onChange={(e) => set("blog_images", form.blog_images.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
                <Button variant="ghost" size="sm" onClick={() => set("blog_images", form.blog_images.filter((_, j) => j !== i))}>Remover</Button>
              </div>
            ))}
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded border border-dashed text-sm text-muted-foreground hover:bg-accent">
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />} Adicionar imagem
              <input type="file" accept="image/*" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "blog"); e.target.value = ""; }} />
            </label>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Título para o Google ({(form.seo_title ?? "").length}/60)</Label><Input value={form.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} /></div>
          <div><Label>Descrição para o Google ({(form.seo_description ?? "").length}/160)</Label><Textarea rows={2} value={form.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} /></div>
        </div>
      </section>

      <div className="flex justify-between">
        <Button variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir este tipo e suas artes prontas?")) remove.mutate(); }}>
          <Trash2 className="h-4 w-4" /> Excluir tipo
        </Button>
        <Button onClick={() => save.mutate(form)} disabled={save.isPending || uploading}>Salvar</Button>
      </div>
    </div>
  );
}

function TemplatesSection({ typeId, templates }: { typeId: string; templates: import("@/lib/label-catalog.functions").LabelTemplate[] }) {
  const qc = useQueryClient();
  const designsFn = useServerFn(listMyDesigns);
  const importFn = useServerFn(adminImportTemplateFromDesign);
  const updFn = useServerFn(adminUpdateTemplate);
  const delFn = useServerFn(adminDeleteTemplate);
  const designs = useQuery({ queryKey: ["label-designs"], queryFn: () => designsFn() });
  const [pick, setPick] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "label-type", typeId] });
    qc.invalidateQueries({ queryKey: ["admin", "label-types"] });
  };
  const imp = useMutation({
    mutationFn: () => importFn({ data: { type_id: typeId, design_id: pick } }),
    onSuccess: () => { setPick(""); refresh(); toast.success("Arte pronta adicionada"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const upd = useMutation({ mutationFn: (d: { id: string; is_published: boolean }) => updFn({ data: d }), onSuccess: refresh });
  const del = useMutation({ mutationFn: (tid: string) => delFn({ data: { id: tid } }), onSuccess: refresh });

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5">
      <div>
        <h2 className="font-semibold">Artes prontas</h2>
        <p className="text-xs text-muted-foreground">
          Crie a arte no editor (botão "Criar arte nesta medida"), salve em Minhas artes e depois adicione aqui.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={pick} onValueChange={setPick}>
          <SelectTrigger className="w-80"><SelectValue placeholder="Escolha uma das suas artes salvas" /></SelectTrigger>
          <SelectContent>
            {(designs.data ?? []).map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name} — {sizeLabel({ width_mm: Number(d.width_mm), height_mm: Number(d.height_mm), shape: d.shape, corner_radius_mm: d.corner_radius_mm })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button disabled={!pick || imp.isPending} onClick={() => imp.mutate()}>
          <Plus className="h-4 w-4" /> Adicionar como arte pronta
        </Button>
      </div>
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma arte pronta ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const d = templateToDesign(t);
            return (
              <div key={t.id} className="rounded border p-3">
                <div className="flex min-h-[130px] items-center justify-center rounded bg-muted/40 p-2">
                  <LabelCanvas design={d} scale={Math.min(220 / d.width_mm, 110 / d.height_mm)} />
                </div>
                <p className="mt-2 text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{sizeLabel(t)}</p>
                <div className="mt-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => upd.mutate({ id: t.id, is_published: !t.is_published })}>
                    {t.is_published ? <><Eye className="h-4 w-4" /> Visível</> : <><EyeOff className="h-4 w-4" /> Oculta</>}
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/etiquetas/editor" search={{ modelo: t.id }} target="_blank"><PenLine className="h-4 w-4" /> Abrir</Link>
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Excluir arte" onClick={() => { if (confirm("Excluir esta arte pronta?")) del.mutate(t.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
