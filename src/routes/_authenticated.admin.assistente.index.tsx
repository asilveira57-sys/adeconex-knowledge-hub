import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Plus, Pencil, Trash2 } from "lucide-react";
import {
  adminListSolutions, adminSaveCategory, adminDeleteCategory, adminCreateJourney, adminDuplicateJourney, adminDeleteJourney,
} from "@/lib/solutions.functions";
import { JOURNEY_STATUS, slugify, type JourneyStatus } from "@/lib/solutions.shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/assistente/")({
  head: () => ({ meta: [{ title: "Assistente de soluções — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AssistenteAdmin,
});

type Cat = Awaited<ReturnType<typeof adminListSolutions>>["categories"][number];
const emptyCat = { slug: "", name: "", short_description: null, description: null, cover_url: null, cover_alt: null, icon: null,
  sort_order: 0, is_active: false, seo_title: null, seo_description: null, seo_content: null } as const;

function AssistenteAdmin() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["admin-solutions"], queryFn: () => adminListSolutions() });
  const [cat, setCat] = useState<(Partial<Cat> & typeof emptyCat) | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-solutions"] });
  const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro");

  const saveCat = useMutation({
    mutationFn: (c: any) => adminSaveCategory({ data: {
      id: c.id, slug: c.slug || slugify(c.name), name: c.name, short_description: c.short_description || null, description: c.description || null,
      cover_url: c.cover_url || null, cover_alt: c.cover_alt || null, icon: c.icon || null, sort_order: Number(c.sort_order) || 0,
      is_active: !!c.is_active, seo_title: c.seo_title || null, seo_description: c.seo_description || null, seo_content: c.seo_content || null } }),
    onSuccess: () => { toast.success("Categoria salva"); setCat(null); refresh(); }, onError: err,
  });
  const delCat = useMutation({ mutationFn: (id: string) => adminDeleteCategory({ data: { id } }), onSuccess: refresh, onError: err });
  const create = useMutation({
    mutationFn: () => adminCreateJourney({ data: { title: "Nova jornada" } }),
    onSuccess: (r) => navigate({ to: "/admin/assistente/$id", params: { id: r.id } }), onError: err,
  });
  const dup = useMutation({ mutationFn: (id: string) => adminDuplicateJourney({ data: { id } }), onSuccess: () => { toast.success("Cópia criada como rascunho"); refresh(); }, onError: err });
  const delJ = useMutation({ mutationFn: (id: string) => adminDeleteJourney({ data: { id } }), onSuccess: refresh, onError: err });

  const cats = data?.categories ?? [];
  const journeys = data?.journeys ?? [];
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "—";
  const tone = (s: string) => (s === "published" ? "default" : s === "draft" ? "secondary" : "outline") as "default" | "secondary" | "outline";

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Assistente de soluções de impressão</h1>
          <p className="text-sm text-muted-foreground">Página pública "Comece por aqui". Só aparecem categorias ativas e jornadas publicadas.</p>
        </div>
        <a href="/comece-por-aqui" target="_blank" rel="noopener"><Button variant="outline" size="sm"><ExternalLink className="h-4 w-4" /> Ver no site</Button></a>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[["Categorias ativas", cats.filter((c) => c.is_active).length], ["Jornadas publicadas", journeys.filter((j) => j.status === "published").length],
          ["Rascunhos", journeys.filter((j) => j.status === "draft").length], ["Inativas", journeys.filter((j) => j.status === "inactive").length]].map(([l, v]) => (
          <div key={l as string} className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="text-2xl font-semibold">{v}</p></div>
        ))}
      </div>

      <Tabs defaultValue="jornadas">
        <TabsList><TabsTrigger value="jornadas">Jornadas</TabsTrigger><TabsTrigger value="categorias">Categorias</TabsTrigger></TabsList>

        <TabsContent value="jornadas" className="space-y-3">
          <Button size="sm" onClick={() => create.mutate()} disabled={create.isPending}><Plus className="h-4 w-4" /> Nova jornada</Button>
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : journeys.map((j) => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
              <div className="min-w-0">
                <p className="font-medium">{j.admin_name}</p>
                <p className="text-xs text-muted-foreground">/comece-por-aqui/{j.slug} · {catName(j.category_id)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={tone(j.status)}>{JOURNEY_STATUS[j.status as JourneyStatus]}</Badge>
                <Link to="/admin/assistente/$id" params={{ id: j.id }}><Button size="sm" variant="outline"><Pencil className="h-4 w-4" /> Editar</Button></Link>
                <Button size="sm" variant="ghost" aria-label="Duplicar" onClick={() => dup.mutate(j.id)}><Copy className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => { if (confirm(`Excluir a jornada "${j.admin_name}"?`)) delJ.mutate(j.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="categorias" className="space-y-3">
          <Button size="sm" onClick={() => setCat({ ...emptyCat, sort_order: cats.length })}><Plus className="h-4 w-4" /> Nova categoria</Button>
          {cats.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
              <div><p className="font-medium">{c.sort_order + 1}. {c.name}</p><p className="text-xs text-muted-foreground">{journeys.filter((j) => j.category_id === c.id).length} jornada(s)</p></div>
              <div className="flex items-center gap-2">
                <Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Ativa" : "Inativa"}</Badge>
                <Button size="sm" variant="outline" onClick={() => setCat(c as any)}><Pencil className="h-4 w-4" /> Editar</Button>
                <Button size="sm" variant="ghost" aria-label="Excluir" onClick={() => { if (confirm(`Excluir a categoria "${c.name}"? As jornadas ficam sem categoria.`)) delCat.mutate(c.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!cat} onOpenChange={(o) => !o && setCat(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{cat?.id ? "Editar categoria" : "Nova categoria"}</DialogTitle></DialogHeader>
          {cat ? (
            <div className="grid gap-3">
              {([["name", "Nome"], ["slug", "Endereço (slug)"], ["short_description", "Descrição curta", true], ["description", "Descrição completa", true],
                ["cover_url", "Link da imagem de capa"], ["cover_alt", "Texto alternativo da imagem"], ["icon", "Ícone (opcional)"],
                ["seo_title", "Título SEO"], ["seo_description", "Meta description", true], ["seo_content", "Conteúdo complementar para SEO", true]] as const).map(([k, l, area]) => (
                <div key={k} className="grid gap-1">
                  <Label htmlFor={`c-${k}`}>{l}</Label>
                  {area ? <Textarea id={`c-${k}`} value={(cat as any)[k] ?? ""} onChange={(e) => setCat({ ...cat, [k]: e.target.value } as any)} />
                    : <Input id={`c-${k}`} value={(cat as any)[k] ?? ""} onChange={(e) => setCat({ ...cat, [k]: e.target.value } as any)} />}
                </div>
              ))}
              <div className="flex items-center gap-6">
                <div className="grid gap-1"><Label htmlFor="c-ord">Ordem</Label><Input id="c-ord" type="number" className="w-24" value={cat.sort_order + 1} onChange={(e) => setCat({ ...cat, sort_order: Math.max(0, Number(e.target.value) - 1) } as any)} /></div>
                <label className="flex items-center gap-2 text-sm"><Switch checked={cat.is_active} onCheckedChange={(v) => setCat({ ...cat, is_active: v } as any)} /> Ativa no site</label>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCat(null)}>Cancelar</Button>
            <Button onClick={() => cat && saveCat.mutate(cat)} disabled={saveCat.isPending || !cat?.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
