import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { adminListCategories, adminSaveCategory } from "@/lib/categories.admin.functions";
import { slugify } from "@/lib/labels/catalog-shared";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, Plus, Pencil, EyeOff, Eye } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Admin Adeconex" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CategoriesPage,
});

type Cat = Awaited<ReturnType<typeof adminListCategories>>[number];
type Form = { id?: string; parent_id: string | null; name: string; slug: string; description: string; seo_title: string; seo_description: string; sort_order: number; is_published: boolean };

const KEY = ["admin", "categories"];

function CategoriesPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: KEY, queryFn: () => adminListCategories() });
  const [filter, setFilter] = useState<"all" | "hidden" | "published">("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  const roots = useMemo(() => {
    const s = search.trim().toLowerCase();
    const match = (c: Cat) =>
      (filter === "all" || (filter === "hidden" ? !c.is_published : c.is_published)) &&
      (!s || c.name.toLowerCase().includes(s));
    const kids = (id: string) => data.filter((c) => c.parent_id === id);
    return data
      .filter((c) => !c.parent_id)
      .map((r) => ({ ...r, children: kids(r.id).filter(match) }))
      .filter((r) => match(r) || r.children.length > 0);
  }, [data, filter, search]);

  const save = async (f: Form) => {
    setSaving(true);
    try {
      await adminSaveCategory({ data: { ...f, sort_order: Number(f.sort_order) || 0 } });
      toast.success("Categoria salva");
      setForm(null);
      qc.invalidateQueries({ queryKey: KEY });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toForm = (c: Cat): Form => ({
    id: c.id, parent_id: c.parent_id, name: c.name, slug: c.slug, description: c.description ?? "",
    seo_title: c.seo_title ?? "", seo_description: c.seo_description ?? "", sort_order: c.sort_order, is_published: c.is_published,
  });
  const blank = (parent_id: string | null): Form => ({ parent_id, name: "", slug: "", description: "", seo_title: "", seo_description: "", sort_order: 0, is_published: false });
  const togglePub = (c: Cat) => save({ ...toForm(c), is_published: !c.is_published });

  const hiddenCount = data.filter((c) => !c.is_published).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-xs">Catálogo</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Menus e categorias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Categorias ocultas só aparecem aqui no admin — não aparecem no site, no menu nem no Google.
          </p>
        </div>
        <Button onClick={() => setForm(blank(null))}><Plus className="h-4 w-4" /> Novo menu</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "hidden", "published"] as const).map((k) => (
          <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
            {k === "all" ? "Todas" : k === "hidden" ? `Ocultas (${hiddenCount})` : "Publicadas"}
          </Button>
        ))}
        <Input className="h-8 w-64" placeholder="Buscar categoria…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
        <div className="space-y-2">
          {roots.map((r) => {
            const isOpen = open[r.id] ?? (!r.is_published || !!search);
            return (
              <Card key={r.id}>
                <CardContent className="p-0">
                  <Row c={r} depth={0} hasKids={r.children.length > 0} open={isOpen}
                    onToggle={() => setOpen({ ...open, [r.id]: !isOpen })}
                    onEdit={() => setForm(toForm(r))} onPub={() => togglePub(r)}
                    onAdd={() => setForm(blank(r.id))} />
                  {isOpen && r.children.map((c) => (
                    <Row key={c.id} c={c} depth={1} onEdit={() => setForm(toForm(c))} onPub={() => togglePub(c)} />
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{form?.id ? "Editar categoria" : form?.parent_id ? "Novo submenu" : "Novo menu"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-3">
              <div>
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Endereço (slug)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></div>
                <div><Label>Ordem</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
              </div>
              <div>
                <Label>Menu principal</Label>
                <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={form.parent_id ?? ""}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value || null })}>
                  <option value="">— Nenhum (é um menu principal) —</option>
                  {data.filter((c) => !c.parent_id && c.id !== form.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Título para o Google</Label><Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">{form.seo_title.length}/60</p></div>
              <div><Label>Descrição para o Google</Label><Textarea rows={2} value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} /><p className="mt-1 text-xs text-muted-foreground">{form.seo_description.length}/160</p></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /> Publicada no site</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button disabled={saving || !form?.name || !form?.slug} onClick={() => form && save(form)}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ c, depth, hasKids, open, onToggle, onEdit, onPub, onAdd }: {
  c: Cat; depth: number; hasKids?: boolean; open?: boolean; onToggle?: () => void; onEdit: () => void; onPub: () => void; onAdd?: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0 ${depth ? "pl-10 bg-muted/30" : ""}`}>
      {depth === 0 ? (
        <button type="button" className="text-muted-foreground" onClick={onToggle} aria-label="Abrir">
          {hasKids ? (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="inline-block w-4" />}
        </button>
      ) : null}
      <span className={depth ? "" : "font-medium"}>{c.name}</span>
      {!c.is_published && <Badge variant="secondary">Oculta</Badge>}
      <span className="text-xs text-muted-foreground">{c.products} produtos</span>
      <div className="ml-auto flex items-center gap-1">
        {onAdd && <Button size="sm" variant="ghost" onClick={onAdd}><Plus className="h-4 w-4" /> Submenu</Button>}
        <Button size="sm" variant="ghost" onClick={onPub} title={c.is_published ? "Ocultar" : "Publicar"}>
          {c.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
