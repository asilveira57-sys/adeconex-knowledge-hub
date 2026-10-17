import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { INSTITUTIONAL_PAGES, type InstPage } from "@/content/institutional-pages";
import { mergeInstitutional, type InstOverride } from "@/lib/institutional-pages.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/paginas")({
  head: () => ({
    meta: [
      { title: "Páginas institucionais — Administração Adeconex" },
      { name: "description", content: "Revise e edite o conteúdo das páginas institucionais e políticas." },
      { property: "og:title", content: "Páginas institucionais — Administração Adeconex" },
      { property: "og:description", content: "Revise e edite o conteúdo das páginas institucionais e políticas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaginasAdmin,
});

type EditSection = { heading: string; paragraphs: string; list: string; pending: string };
type Form = { title: string; h1: string; description: string; intro: string; updated: string; draftNotice: string; sections: EditSection[] };

const KEYS = Object.keys(INSTITUTIONAL_PAGES);
const toForm = (p: InstPage): Form => ({
  title: p.title, h1: p.h1, description: p.description, intro: p.intro, updated: p.updated, draftNotice: p.draftNotice ?? "",
  sections: p.sections.map((s) => ({ heading: s.heading, paragraphs: (s.paragraphs ?? []).join("\n\n"), list: (s.list ?? []).join("\n"), pending: s.pending ?? "" })),
});
const fromForm = (f: Form): InstOverride => ({
  title: f.title.trim(), h1: f.h1.trim(), description: f.description.trim(), intro: f.intro.trim(), updated: f.updated.trim(),
  draftNotice: f.draftNotice.trim() || undefined,
  sections: f.sections.filter((s) => s.heading.trim()).map((s) => ({
    heading: s.heading.trim(),
    paragraphs: s.paragraphs.split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean),
    list: s.list.split("\n").map((t) => t.trim()).filter(Boolean),
    pending: s.pending.trim() || undefined,
  })),
});
const todayBR = () => new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });

function PaginasAdmin() {
  const qc = useQueryClient();
  const [key, setKey] = useState(KEYS[0]);
  const { data: rows } = useQuery({
    queryKey: ["admin", "institutional-pages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("institutional_pages").select("key, content, updated_at");
      if (error) throw error;
      return data ?? [];
    },
  });
  const row = rows?.find((r) => r.key === key);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (rows) setForm(toForm(mergeInstitutional(key, (row?.content as InstOverride) ?? null)));
  }, [key, rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (patch: Partial<Form>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const setSec = (i: number, patch: Partial<EditSection>) =>
    setForm((f) => (f ? { ...f, sections: f.sections.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : f));
  const moveSec = (i: number, d: number) =>
    setForm((f) => {
      if (!f) return f;
      const s = [...f.sections];
      const j = i + d;
      if (j < 0 || j >= s.length) return f;
      [s[i], s[j]] = [s[j], s[i]];
      return { ...f, sections: s };
    });

  const save = async () => {
    if (!form) return;
    if (!form.title.trim() || !form.h1.trim()) return toast.error("Preencha o título SEO e o título da página.");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("institutional_pages").upsert({ key, content: fromForm(form) as never, updated_at: new Date().toISOString(), updated_by: u.user?.id ?? null });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar: " + error.message);
    toast.success("Página atualizada no site.");
    qc.invalidateQueries({ queryKey: ["admin", "institutional-pages"] });
  };

  const restore = async () => {
    if (!confirm("Voltar esta página ao texto original? As suas edições serão apagadas.")) return;
    const { error } = await supabase.from("institutional_pages").delete().eq("key", key);
    if (error) return toast.error("Não foi possível restaurar: " + error.message);
    toast.success("Texto original restaurado.");
    qc.invalidateQueries({ queryKey: ["admin", "institutional-pages"] });
  };

  const base = INSTITUTIONAL_PAGES[key];
  const groups = ["Institucional", "Ajuda e atendimento", "Legal e privacidade"] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Páginas institucionais</h1>
        <p className="text-sm text-muted-foreground">Revise e atualize textos das páginas institucionais, de ajuda e das políticas. As alterações aparecem no site ao salvar.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-4">
          {groups.map((g) => (
            <div key={g}>
              <p className="eyebrow mb-2">{g}</p>
              <ul className="space-y-1">
                {KEYS.filter((k) => INSTITUTIONAL_PAGES[k].group === g).map((k) => (
                  <li key={k}>
                    <button type="button" onClick={() => setKey(k)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm ${k === key ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                      <span>{INSTITUTIONAL_PAGES[k].h1}</span>
                      {rows?.some((r) => r.key === k) && <span className="text-[10px] opacity-80">editada</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        {form && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant={row ? "default" : "secondary"}>{row ? "Editada" : "Texto original"}</Badge>
                {row && <span className="text-xs text-muted-foreground">Salva em {new Date(row.updated_at).toLocaleString("pt-BR")}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={base.path} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-4 w-4" /> Ver no site</a>
                </Button>
                {row && <Button variant="outline" size="sm" onClick={restore}><RotateCcw className="mr-1 h-4 w-4" /> Restaurar original</Button>}
                <Button size="sm" onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}</Button>
              </div>
            </div>

            <Card><CardContent className="grid gap-4 p-5 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Título da página (H1)</Label><Input value={form.h1} onChange={(e) => set({ h1: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Data de atualização</Label>
                <div className="flex gap-2"><Input value={form.updated} onChange={(e) => set({ updated: e.target.value })} /><Button type="button" variant="outline" size="sm" onClick={() => set({ updated: todayBR() })}>Hoje</Button></div>
              </div>
              <div className="space-y-1.5 md:col-span-2"><Label>Texto de abertura</Label><Textarea rows={2} value={form.intro} onChange={(e) => set({ intro: e.target.value })} /></div>
              <div className="space-y-1.5 md:col-span-2"><Label>Aviso no topo (ex.: "em revisão") — deixe vazio para remover</Label><Input value={form.draftNotice} onChange={(e) => set({ draftNotice: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Título no Google (SEO) <span className="text-muted-foreground">{form.title.length}/60</span></Label><Input value={form.title} onChange={(e) => set({ title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Descrição no Google <span className="text-muted-foreground">{form.description.length}/160</span></Label><Textarea rows={2} value={form.description} onChange={(e) => set({ description: e.target.value })} /></div>
            </CardContent></Card>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Seções</p>
              {form.sections.map((s, i) => (
                <Card key={i}><CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <Input value={s.heading} placeholder="Subtítulo da seção" onChange={(e) => setSec(i, { heading: e.target.value })} className="font-medium" />
                    <Button type="button" variant="ghost" size="icon" aria-label="Subir" onClick={() => moveSec(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Descer" onClick={() => moveSec(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remover seção" onClick={() => setForm({ ...form, sections: form.sections.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">Parágrafos (separe com uma linha em branco)</Label><Textarea rows={4} value={s.paragraphs} onChange={(e) => setSec(i, { paragraphs: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Lista com marcadores (um item por linha)</Label><Textarea rows={3} value={s.list} onChange={(e) => setSec(i, { list: e.target.value })} /></div>
                  <div className="space-y-1.5"><Label className="text-xs">Pendência destacada (⚠) — apague quando estiver resolvida</Label><Input value={s.pending} onChange={(e) => setSec(i, { pending: e.target.value })} /></div>
                </CardContent></Card>
              ))}
              <Button type="button" variant="outline" onClick={() => setForm({ ...form, sections: [...form.sections, { heading: "", paragraphs: "", list: "", pending: "" }] })}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar seção
              </Button>
            </div>

            <div className="flex justify-end"><Button onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" /> {saving ? "Salvando..." : "Salvar"}</Button></div>
          </div>
        )}
      </div>
    </div>
  );
}
