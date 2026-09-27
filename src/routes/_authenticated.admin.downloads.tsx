import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DOWNLOAD_KINDS, kindLabel, type DownloadRow } from "@/lib/downloads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [edit, setEdit] = useState<Form | null>(null);
  const [q, setQ] = useState("");

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
                    <td className="p-3 font-medium">{d.title}</td>
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
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
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
              <div><Label>Imagem (link)</Label><Input value={edit.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Resumo</Label><Textarea rows={2} value={edit.summary ?? ""} onChange={(e) => set("summary", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Tutorial de instalação (HTML)</Label><Textarea rows={8} className="font-mono text-xs" value={edit.content_html ?? ""} onChange={(e) => set("content_html", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Título para o Google</Label><Input value={edit.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Descrição para o Google</Label><Textarea rows={2} value={edit.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} /></div>
              <div className="sm:col-span-2"><Label>Palavras-chave</Label><Input value={edit.seo_keywords ?? ""} onChange={(e) => set("seo_keywords", e.target.value)} /></div>
              <div className="flex items-center gap-2"><Switch checked={edit.is_published ?? true} onCheckedChange={(v) => set("is_published", v)} /><Label>Publicado no site</Label></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button disabled={save.isPending} onClick={() => edit && save.mutate(edit)}>
              {save.isPending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
