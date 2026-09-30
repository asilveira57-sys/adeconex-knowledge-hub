import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, ImagePlus, Loader2, Pencil, Plus, Search, Sparkles, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DOWNLOAD_KINDS, generateDownloadSeo, kindLabel, type DownloadRow } from "@/lib/downloads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { buildFaq, parseFaqs, type FaqItem } from "@/lib/download-faq";

function FaqEditor({ raw, onChange, suggestions }: { value: FaqItem[]; rawLength: number; raw: FaqItem[]; onChange: (v: FaqItem[]) => void; suggestions: () => FaqItem[] }) {
  const update = (i: number, k: "q" | "a", v: string) => onChange(raw.map((f, j) => (j === i ? { ...f, [k]: v } : f)));
  const move = (i: number, d: number) => {
    const n = [...raw]; const t = i + d; if (t < 0 || t >= n.length) return;
    [n[i], n[t]] = [n[t], n[i]]; onChange(n);
  };
  return (
    <div className="sm:col-span-2 space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-medium">Perguntas frequentes</h3>
          <p className="text-xs text-muted-foreground">
            {raw.length ? "Estas perguntas substituem as automáticas na página." : "Sem perguntas personalizadas: a página mostra as automáticas, feitas só com os dados preenchidos."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onChange(suggestions())}>Carregar sugestões</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange([...raw, { q: "", a: "" }])}><Plus className="mr-1 h-4 w-4" /> Pergunta</Button>
        </div>
      </div>
      <p className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
        Informe somente compatibilidades confirmadas pelo fabricante (sistemas, modelos e versões). Na dúvida, oriente o cliente a falar com a equipe.
      </p>
      {raw.map((f, i) => (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Input placeholder="Pergunta" value={f.q} maxLength={200} onChange={(e) => update(i, "q", e.target.value)} />
            <Button type="button" variant="ghost" size="sm" onClick={() => move(i, -1)} aria-label="Subir">↑</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => move(i, 1)} aria-label="Descer">↓</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(raw.filter((_, j) => j !== i))} aria-label="Remover"><Trash2 className="h-4 w-4" /></Button>
          </div>
          <Textarea placeholder="Resposta" rows={3} maxLength={1200} value={f.a} onChange={(e) => update(i, "a", e.target.value)} />
          {(!f.q.trim() || !f.a.trim()) ? <p className="text-xs text-destructive">Perguntas sem resposta não são publicadas.</p> : null}
        </div>
      ))}
      {raw.length ? <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>Voltar às perguntas automáticas</Button> : null}
    </div>
  );
}
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/downloads")({
  head: () => ({
    meta: [
      { title: "Downloads — Administração Adeconex" },
      { name: "description", content: "Cadastro de drivers, softwares e arquivos da central de downloads." },
      { property: "og:title", content: "Downloads — Administração Adeconex" },
      { property: "og:description", content: "Cadastro de drivers, softwares e arquivos da central de downloads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDownloadsPage,
});

type Form = Partial<DownloadRow>;
const EMPTY: Form = { kind: "driver", title: "", slug: "", download_url: "", is_published: true, sort_order: 0 };

const slugify = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function AdminDownloadsPage() {
  const qc = useQueryClient();
  const generateSeo = useServerFn(generateDownloadSeo);
  const [edit, setEdit] = useState<Form | null>(null);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [dragging, setDragging] = useState(false);

  const list = useQuery({
    queryKey: ["admin-downloads"],
    queryFn: async () => {
      const { data, error } = await supabase.from("downloads").select("*").order("kind").order("brand").order("title");
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      if (!f.title?.trim() || !f.download_url?.trim()) throw new Error("Preencha o nome e o link de download.");
      const payload = {
        slug: f.slug?.trim() || slugify(`${f.kind}-${f.brand ?? ""}-${f.model || f.title}`),
        kind: f.kind ?? "driver",
        title: f.title.trim(),
        brand: f.brand || null,
        model: f.model || null,
        version: f.version || null,
        operating_system: f.operating_system || null,
        download_url: f.download_url.trim(),
        file_size: f.file_size || null,
        summary: f.summary || null,
        content_html: f.content_html || null,
        image_url: f.image_url || null,
        seo_title: f.seo_title || null,
        seo_description: f.seo_description || null,
        seo_keywords: f.seo_keywords || null,
        faqs: parseFaqs(f.faqs) as unknown as DownloadRow["faqs"],
        is_published: f.is_published ?? true,
        sort_order: Number(f.sort_order) || 0,
      };
      const res = f.id
        ? await supabase.from("downloads").update(payload).eq("id", f.id)
        : await supabase.from("downloads").insert(payload);
      if (res.error) throw new Error(res.error.code === "23505" ? "Já existe um download com esse endereço." : res.error.message);
    },
    onSuccess: () => {
      toast.success("Download salvo");
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-downloads"] });
      qc.invalidateQueries({ queryKey: ["public-downloads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("downloads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Download removido");
      qc.invalidateQueries({ queryKey: ["admin-downloads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (list.data ?? []).filter((d) =>
    `${d.title} ${d.brand ?? ""} ${d.model ?? ""}`.toLowerCase().includes(q.toLowerCase()),
  );
  const set = (k: keyof Form, v: unknown) => setEdit((e) => ({ ...(e ?? {}), [k]: v }));

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Escolha um arquivo de imagem.");
    if (file.size > 5 * 1024 * 1024) return toast.error("A imagem deve ter no máximo 5 MB.");
    setUploading(true);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `downloads/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("catalog-media").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("catalog-media").getPublicUrl(path);
      set("image_url", data.publicUrl);
      toast.success("Imagem enviada");
    } catch (error) {
      toast.error((error as Error).message || "Não foi possível enviar a imagem.");
    } finally {
      setUploading(false);
      setDragging(false);
    }
  };

  const fillSeo = async () => {
    if (!edit?.title?.trim()) return toast.error("Preencha o nome antes de gerar o SEO.");
    setGenerating(true);
    try {
      const result = await generateSeo({
        data: {
          kind: edit.kind ?? "driver",
          title: edit.title.trim(),
          brand: edit.brand ?? undefined,
          model: edit.model ?? undefined,
          version: edit.version ?? undefined,
          operatingSystem: edit.operating_system ?? undefined,
          currentSummary: edit.summary ?? undefined,
        },
      });
      setEdit((current) => current ? { ...current, ...result } : current);
      toast.success("SEO gerado. Revise antes de salvar.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const seoChecks = edit ? [
    { label: "Título entre 30 e 60 caracteres", ok: (edit.seo_title?.length ?? 0) >= 30 && (edit.seo_title?.length ?? 0) <= 60 },
    { label: "Descrição entre 80 e 160 caracteres", ok: (edit.seo_description?.length ?? 0) >= 80 && (edit.seo_description?.length ?? 0) <= 160 },
    { label: "Palavras-chave preenchidas", ok: Boolean(edit.seo_keywords?.trim()) },
    { label: "Resumo preenchido", ok: Boolean(edit.summary?.trim()) },
    { label: "Imagem cadastrada", ok: Boolean(edit.image_url?.trim()) },
    { label: "Marca e modelo informados", ok: Boolean(edit.brand?.trim() && edit.model?.trim()) },
  ] : [];
  const seoScore = seoChecks.length ? Math.round(seoChecks.filter((check) => check.ok).length / seoChecks.length * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Downloads</h1>
          <p className="text-sm text-muted-foreground">Drivers, softwares, manuais e arquivos da central pública.</p>
        </div>
        <Button onClick={() => setEdit({ ...EMPTY })}><Plus className="mr-1 h-4 w-4" /> Novo download</Button>
      </div>

      <Input placeholder="Buscar por nome, marca ou modelo" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />

      <Card>
        <CardContent className="p-0">
          {list.isLoading ? (
            <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr><th className="p-3">Nome</th><th className="p-3">Tipo</th><th className="p-3">Marca</th><th className="p-3">Versão</th><th className="p-3">Status</th><th className="p-3" /></tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="p-3 font-medium"><div className="flex items-center gap-3"><div className="h-11 w-11 shrink-0 overflow-hidden rounded border bg-muted">{d.image_url ? <img src={d.image_url} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="m-3 h-4 w-4 text-muted-foreground" />}</div><span>{d.title}</span></div></td>
                    <td className="p-3">{kindLabel(d.kind)}</td>
                    <td className="p-3">{d.brand ?? "—"}</td>
                    <td className="p-3">{d.version ?? "—"}</td>
                    <td className="p-3">{d.is_published ? <Badge>Publicado</Badge> : <Badge variant="secondary">Oculto</Badge>}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" asChild title="Ver no site">
                          <a href={`/downloads/${d.slug}`} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEdit(d)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" title="Excluir" onClick={() => confirm(`Excluir "${d.title}"?`) && remove.mutate(d.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum download.</td></tr> : null}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
          <DialogHeader><DialogTitle>{edit?.id ? "Editar download" : "Novo download"}</DialogTitle></DialogHeader>
          {edit ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome</Label><Input value={edit.title ?? ""} onChange={(e) => set("title", e.target.value)} placeholder="Driver Zebra ZD220" /></div>
              <div>
                <Label>Tipo</Label>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={edit.kind ?? "driver"} onChange={(e) => set("kind", e.target.value)}>
                  {DOWNLOAD_KINDS.map((k) => <option key={k.value} value={k.value}>{kindLabel(k.value)}</option>)}
                </select>
              </div>
              <div><Label>Endereço na página (opcional)</Label><Input value={edit.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} placeholder="gerado automaticamente" /></div>
              <div><Label>Marca</Label><Input value={edit.brand ?? ""} onChange={(e) => set("brand", e.target.value)} /></div>
              <div><Label>Modelo</Label><Input value={edit.model ?? ""} onChange={(e) => set("model", e.target.value)} /></div>
              <div><Label>Versão</Label><Input value={edit.version ?? ""} onChange={(e) => set("version", e.target.value)} /></div>
              <div><Label>Sistema operacional</Label><Input value={edit.operating_system ?? ""} onChange={(e) => set("operating_system", e.target.value)} placeholder="Windows 10/11" /></div>
              <div className="sm:col-span-2"><Label>Link de download</Label><Input value={edit.download_url ?? ""} onChange={(e) => set("download_url", e.target.value)} placeholder="https://drive.google.com/..." /></div>
               <div><Label>Tamanho do arquivo</Label><Input value={edit.file_size ?? ""} onChange={(e) => set("file_size", e.target.value)} placeholder="45 MB" /></div>
               <div className="sm:col-span-2 space-y-2">
                 <Label>Imagem do equipamento ou software</Label>
                 <label
                   className={`flex min-h-40 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed p-4 transition-colors ${dragging ? "border-primary bg-accent" : "bg-muted/30 hover:bg-accent"}`}
                   onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                   onDragLeave={() => setDragging(false)}
                   onDrop={(event) => { event.preventDefault(); const file = event.dataTransfer.files[0]; if (file) void uploadImage(file); }}
                 >
                   <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} />
                   {uploading ? (
                     <span className="flex items-center gap-2 text-sm"><Loader2 className="h-5 w-5 animate-spin" /> Enviando imagem...</span>
                   ) : edit.image_url ? (
                     <img src={edit.image_url} alt="Prévia da imagem" className="max-h-52 w-full object-contain" />
                   ) : (
                     <span className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground"><Upload className="h-7 w-7" /> Clique ou arraste uma imagem aqui<span className="text-xs">JPG, PNG, WebP ou AVIF · até 5 MB</span></span>
                   )}
                 </label>
                 <div className="flex flex-wrap gap-2">
                   {edit.image_url ? <Button type="button" size="sm" variant="outline" onClick={() => set("image_url", null)}><Trash2 className="mr-1 h-3 w-3" /> Remover imagem</Button> : null}
                 </div>
                 <div><Label className="text-xs text-muted-foreground">Ou informe um link direto</Label><Input value={edit.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="https://..." /></div>
               </div>
              <div className="sm:col-span-2"><Label>Resumo</Label><Textarea rows={2} value={edit.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Tutorial de instalação (HTML)</Label><Textarea rows={8} className="font-mono text-xs" value={edit.content_html ?? ""} onChange={(e) => set("content_html", e.target.value)} /></div>
              <FaqEditor
                value={parseFaqs(edit.faqs)}
                rawLength={Array.isArray(edit.faqs) ? edit.faqs.length : 0}
                raw={(Array.isArray(edit.faqs) ? edit.faqs : []) as FaqItem[]}
                onChange={(v) => set("faqs", v as unknown as DownloadRow["faqs"])}
                suggestions={() => buildFaq({ title: edit.title ?? "", kind: edit.kind ?? "driver", brand: edit.brand ?? null, model: edit.model ?? null, version: edit.version ?? null, operating_system: edit.operating_system ?? null, file_size: edit.file_size ?? null })}
              />
               <div className="sm:col-span-2 flex items-center justify-between gap-3 border-t pt-4"><div><h3 className="font-medium">SEO da página</h3><p className="text-xs text-muted-foreground">A geração usa somente os dados preenchidos e pode ser revisada.</p></div><Button type="button" variant="outline" disabled={generating || !edit.title?.trim()} onClick={fillSeo}>{generating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />} Gerar SEO</Button></div>
               <div className="sm:col-span-2"><div className="flex justify-between"><Label>Título para o Google</Label><span className="text-xs text-muted-foreground">{edit.seo_title?.length ?? 0}/60</span></div><Input maxLength={200} value={edit.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} /></div>
               <div className="sm:col-span-2"><div className="flex justify-between"><Label>Descrição para o Google</Label><span className="text-xs text-muted-foreground">{edit.seo_description?.length ?? 0}/160</span></div><Textarea maxLength={300} rows={2} value={edit.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Palavras-chave</Label><Input value={edit.seo_keywords ?? ""} onChange={(e) => set("seo_keywords", e.target.value)} /></div>
               <div className="sm:col-span-2 grid gap-4 rounded-md border p-4 md:grid-cols-[1.4fr_1fr]">
                 <div><p className="flex items-center gap-2 text-xs text-muted-foreground"><Search className="h-3.5 w-3.5" /> www.adeconex.com.br/downloads/{edit.slug || slugify(`${edit.kind}-${edit.brand ?? ""}-${edit.model || edit.title}`)}</p><p className="mt-1 text-lg text-primary">{edit.seo_title || edit.title || "Título da página"}</p><p className="mt-1 text-sm text-muted-foreground">{edit.seo_description || edit.summary || "A descrição para o Google aparecerá aqui."}</p></div>
                 <div><p className="text-sm font-medium">Saúde SEO — {seoScore}%</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${seoScore}%` }} /></div><ul className="mt-2 space-y-1 text-xs">{seoChecks.map((check) => <li key={check.label} className={check.ok ? "text-foreground" : "text-muted-foreground"}>{check.ok ? "✓" : "○"} {check.label}</li>)}</ul></div>
               </div>
              <div className="flex items-center gap-2"><Switch checked={edit.is_published ?? true} onCheckedChange={(v) => set("is_published", v)} /><Label>Publicado no site</Label></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button disabled={save.isPending || uploading || generating} onClick={() => edit && save.mutate(edit)}>
              {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
