import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, ExternalLink, Plus, Trash2, AlertTriangle } from "lucide-react";
import { adminGetJourney, adminSaveJourney, adminListSolutions, adminSearchProducts } from "@/lib/solutions.functions";
import {
  ITEM_CATEGORIES, JOURNEY_STATUS, STEP_TYPES, slugify, validateJourney, type JourneyDraft, type RecDraft, type StepDraft, type Condition,
} from "@/lib/solutions.shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/assistente/$id")({
  head: () => ({ meta: [{ title: "Editar jornada — Admin" }, { name: "robots", content: "noindex" }] }),
  component: JourneyEditor,
});

const sel = "h-9 rounded-md border bg-background px-2 text-sm";
const uid = () => crypto.randomUUID();
const newRec = (): RecDraft => ({
  id: uid(), product_id: null, item_category: "outros", role: null, reason: null, is_required: false, quantity: null, sort_order: 0,
  notes: null, is_active: true, show_when: null, ext_name: null, ext_description: null, ext_manufacturer: null, ext_model: null,
  ext_image_url: null, ext_platform: null, ext_original_url: null, ext_affiliate_url: null, is_affiliate: false, ext_offer_id: null,
  ext_checked_at: null, ext_link_status: "ok", ext_button_text: null,
});
const newStep = (): StepDraft => ({
  id: uid(), internal_name: null, title: "Nova etapa", body: null, step_type: "text", image_url: null, image_alt: null, sort_order: 0,
  is_required: false, guidance: null, options: [], condition: null, recommendations: [],
});
function move<T>(arr: T[], i: number, d: number) { const a = [...arr]; const j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; }

function F({ label, value, onChange, area, type, placeholder }: { label: string; value: string | null; onChange: (v: string | null) => void; area?: boolean; type?: string; placeholder?: string }) {
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      {area ? <Textarea value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value || null)} />
        : <Input type={type} value={value ?? ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value || null)} />}
    </div>
  );
}

function ConditionPicker({ value, onChange, steps, label }: { value: Condition; onChange: (c: Condition) => void; steps: StepDraft[]; label: string }) {
  const choices = steps.filter((s) => (s.step_type === "single" || s.step_type === "multiple") && s.options.length);
  const src = choices.find((s) => s.id === value?.step_id);
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <select className={sel} value={value?.step_id ?? ""} onChange={(e) => onChange(e.target.value ? { step_id: e.target.value, values: [] } : null)}>
        <option value="">Sempre</option>
        {choices.map((s) => <option key={s.id} value={s.id}>Quando “{s.title}” for…</option>)}
      </select>
      {src ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {src.options.map((o) => {
            const on = value!.values.includes(o.value);
            return <button type="button" key={o.value} onClick={() => onChange({ ...value!, values: on ? value!.values.filter((v) => v !== o.value) : [...value!.values, o.value] })}
              className={`rounded-full border px-2 py-0.5 text-xs ${on ? "border-primary bg-primary/10 text-primary" : ""}`}>{o.label}</button>;
          })}
        </div>
      ) : null}
    </div>
  );
}

function ProductPicker({ value, label, onPick }: { value: string | null; label?: string; onPick: (id: string | null, name?: string) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setD] = useState("");
  useEffect(() => { const t = setTimeout(() => setD(q), 300); return () => clearTimeout(t); }, [q]);
  const { data } = useQuery({ queryKey: ["sol-prod-search", debounced], queryFn: () => adminSearchProducts({ data: { q: debounced } }), enabled: debounced.length >= 2 });
  if (value) return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
      <span>{label ?? "Produto do catálogo"}</span>
      <Button size="sm" variant="ghost" onClick={() => onPick(null)}>Trocar</Button>
    </div>
  );
  return (
    <div className="grid gap-1">
      <Input placeholder="Buscar produto do catálogo por nome ou SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
      {data?.length ? <div className="max-h-48 overflow-y-auto rounded-md border">{data.map((p) => (
        <button key={p.id} type="button" className="block w-full px-3 py-1.5 text-left text-sm hover:bg-muted" onClick={() => { onPick(p.id, p.name); setQ(""); }}>
          {p.name}{p.sku ? <span className="text-xs text-muted-foreground"> · {p.sku}</span> : null}
        </button>))}</div> : null}
    </div>
  );
}

function JourneyEditor() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-journey", id], queryFn: () => adminGetJourney({ data: { id } }) });
  const { data: list } = useQuery({ queryKey: ["admin-solutions"], queryFn: () => adminListSolutions() });
  const [j, setJ] = useState<JourneyDraft | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    if (data) { setJ(data.journey); setNames(Object.fromEntries(data.products.map((p) => [p.id, p.name]))); }
  }, [data]);

  const save = useMutation({
    mutationFn: (draft: JourneyDraft) => adminSaveJourney({ data: draft as any }),
    onSuccess: (r) => {
      if (!r.ok) { setErrors(r.errors); toast.error("Não foi possível salvar. Veja os avisos."); return; }
      setErrors([]); toast.success("Jornada salva"); qc.invalidateQueries({ queryKey: ["admin-solutions"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (isLoading || !j) return <p className="p-6 text-sm text-muted-foreground">{error ? (error as Error).message : "Carregando…"}</p>;
  const set = (patch: Partial<JourneyDraft>) => setJ({ ...j, ...patch });
  const setStep = (i: number, patch: Partial<StepDraft>) => set({ steps: j.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)) });
  const setRec = (i: number, r: number, patch: Partial<RecDraft>) =>
    setStep(i, { recommendations: j.steps[i].recommendations.map((x, k) => (k === r ? { ...x, ...patch } : x)) });
  const pending = validateJourney(j);

  return (
    <div className="space-y-6 p-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/assistente" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        {j.status === "published" ? <a href={`/comece-por-aqui/${j.slug}`} target="_blank" rel="noopener"><Button size="sm" variant="outline"><ExternalLink className="h-4 w-4" /> Ver no site</Button></a> : null}
      </div>

      <Card>
        <CardHeader><CardTitle>Dados da jornada</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <F label="Nome administrativo" value={j.admin_name} onChange={(v) => set({ admin_name: v ?? "" })} />
          <F label="Título público" value={j.title} onChange={(v) => set({ title: v ?? "" })} />
          <div className="grid gap-1">
            <Label className="text-xs">Endereço: /comece-por-aqui/…</Label>
            <div className="flex gap-2"><Input value={j.slug} onChange={(e) => set({ slug: e.target.value })} onBlur={() => set({ slug: slugify(j.slug) })} />
              <Button type="button" variant="outline" size="sm" onClick={() => set({ slug: slugify(j.title) })}>Gerar</Button></div>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Categoria principal</Label>
            <select className={sel} value={j.category_id ?? ""} onChange={(e) => set({ category_id: e.target.value || null })}>
              <option value="">—</option>{list?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Estado</Label>
            <select className={sel} value={j.status} onChange={(e) => set({ status: e.target.value as JourneyDraft["status"] })}>
              {Object.entries(JOURNEY_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>
          <F label="Ordem de exibição" type="number" value={String(j.sort_order + 1)} onChange={(v) => set({ sort_order: Math.max(0, Number(v) - 1) })} />
          <F label="Título H1 (opcional)" value={j.h1} onChange={(v) => set({ h1: v })} />
          <F label="Link da imagem de capa" value={j.cover_url} onChange={(v) => set({ cover_url: v })} />
          <F label="Texto alternativo da capa" value={j.cover_alt} onChange={(v) => set({ cover_alt: v })} />
          <div className="md:col-span-2 grid gap-4">
            <F area label="Descrição introdutória" value={j.intro} onChange={(v) => set({ intro: v })} />
            <F area label="Conteúdo editorial antes do assistente" value={j.content_before} onChange={(v) => set({ content_before: v })} />
            <F area label="Texto de apresentação" value={j.presentation} onChange={(v) => set({ presentation: v })} />
            <F area label="Texto de encerramento" value={j.closing} onChange={(v) => set({ closing: v })} />
            <F area label="Conteúdo editorial depois do assistente" value={j.content_after} onChange={(v) => set({ content_after: v })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>SEO</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <F label={`Meta title (${(j.seo_title ?? "").length}/60)`} value={j.seo_title} onChange={(v) => set({ seo_title: v })} />
          <F label="URL canônica (opcional)" value={j.canonical_url} onChange={(v) => set({ canonical_url: v })} placeholder="https://adeconex.com.br/…" />
          <div className="md:col-span-2"><F area label={`Meta description (${(j.seo_description ?? "").length}/160)`} value={j.seo_description} onChange={(v) => set({ seo_description: v })} /></div>
          <label className="flex items-center gap-2 text-sm"><Switch checked={j.indexable} onCheckedChange={(v) => set({ indexable: v })} /> Permitir que o Google indexe (só vale quando publicada)</label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Perguntas frequentes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {j.faqs.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-md border p-3">
              <Input placeholder="Pergunta" value={f.q} onChange={(e) => set({ faqs: j.faqs.map((x, k) => (k === i ? { ...x, q: e.target.value } : x)) })} />
              <Textarea placeholder="Resposta" value={f.a} onChange={(e) => set({ faqs: j.faqs.map((x, k) => (k === i ? { ...x, a: e.target.value } : x)) })} />
              <Button size="sm" variant="ghost" className="justify-self-end" onClick={() => set({ faqs: j.faqs.filter((_, k) => k !== i) })}><Trash2 className="h-4 w-4" /> Remover</Button>
            </div>
          ))}
          <Button size="sm" variant="outline" onClick={() => set({ faqs: [...j.faqs, { q: "", a: "" }] })}><Plus className="h-4 w-4" /> Adicionar pergunta</Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Etapas</h2>
        {j.steps.map((s, i) => (
          <Card key={s.id}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">Etapa {i + 1}: {s.title}</CardTitle>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" aria-label="Subir" onClick={() => set({ steps: move(j.steps, i, -1) })}><ArrowUp className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Descer" onClick={() => set({ steps: move(j.steps, i, 1) })}><ArrowDown className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Duplicar" onClick={() => {
                  const c: StepDraft = { ...structuredClone(s), id: uid(), title: `${s.title} (cópia)` };
                  c.recommendations = c.recommendations.map((r) => ({ ...r, id: uid() }));
                  set({ steps: [...j.steps.slice(0, i + 1), c, ...j.steps.slice(i + 1)] });
                }}><Copy className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" aria-label="Remover" onClick={() => { if (confirm("Remover esta etapa e seus itens?")) set({ steps: j.steps.filter((_, k) => k !== i) }); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <F label="Título público" value={s.title} onChange={(v) => setStep(i, { title: v ?? "" })} />
                <F label="Nome interno" value={s.internal_name} onChange={(v) => setStep(i, { internal_name: v })} />
                <div className="grid gap-1">
                  <Label className="text-xs">Tipo</Label>
                  <select className={sel} value={s.step_type} onChange={(e) => setStep(i, { step_type: e.target.value as StepDraft["step_type"] })}>
                    {STEP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <F area label="Texto explicativo" value={s.body} onChange={(v) => setStep(i, { body: v })} />
              <div className="grid gap-4 md:grid-cols-3">
                <F label="Mensagem de orientação" value={s.guidance} onChange={(v) => setStep(i, { guidance: v })} />
                <F label="Link da imagem (opcional)" value={s.image_url} onChange={(v) => setStep(i, { image_url: v })} />
                <F label="Texto alternativo da imagem" value={s.image_alt} onChange={(v) => setStep(i, { image_alt: v })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ConditionPicker label="Mostrar esta etapa" value={s.condition} steps={j.steps.slice(0, i)} onChange={(c) => setStep(i, { condition: c })} />
                <label className="flex items-center gap-2 self-end text-sm"><Switch checked={s.is_required} onCheckedChange={(v) => setStep(i, { is_required: v })} /> Resposta obrigatória</label>
              </div>

              {(s.step_type === "single" || s.step_type === "multiple") ? (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm font-medium">Opções para o visitante</p>
                  {s.options.map((o, k) => (
                    <div key={k} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <Input placeholder="Texto da opção" value={o.label} onChange={(e) => setStep(i, { options: s.options.map((x, n) => (n === k ? { ...x, label: e.target.value, value: x.value || slugify(e.target.value) } : x)) })} />
                      <Input placeholder="Explicação curta (opcional)" value={o.description ?? ""} onChange={(e) => setStep(i, { options: s.options.map((x, n) => (n === k ? { ...x, description: e.target.value } : x)) })} />
                      <Button size="sm" variant="ghost" onClick={() => setStep(i, { options: s.options.filter((_, n) => n !== k) })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setStep(i, { options: [...s.options, { value: `opcao-${s.options.length + 1}`, label: "" }] })}><Plus className="h-4 w-4" /> Adicionar opção</Button>
                </div>
              ) : null}

              {s.step_type !== "final" ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Itens recomendados nesta etapa</p>
                  {s.recommendations.map((r, k) => (
                    <div key={r.id} className="space-y-3 rounded-md border bg-muted/20 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant={r.product_id !== null || r.ext_name === null ? "default" : "outline"} onClick={() => setRec(i, k, { ext_name: null })}>Produto Adeconex</Button>
                          <Button size="sm" variant={r.product_id === null && r.ext_name !== null ? "default" : "outline"} onClick={() => setRec(i, k, { product_id: null, ext_name: r.ext_name ?? "" })}>Externo / afiliado</Button>
                        </div>
                        <div className="flex items-center gap-1">
                          <label className="flex items-center gap-1 text-xs"><Switch checked={r.is_active} onCheckedChange={(v) => setRec(i, k, { is_active: v })} /> Ativo</label>
                          <Button size="sm" variant="ghost" onClick={() => setStep(i, { recommendations: move(s.recommendations, k, -1) })}><ArrowUp className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setStep(i, { recommendations: move(s.recommendations, k, 1) })}><ArrowDown className="h-4 w-4" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setStep(i, { recommendations: s.recommendations.filter((_, n) => n !== k) })}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      {r.ext_name === null ? (
                        <ProductPicker value={r.product_id} label={r.product_id ? names[r.product_id] : undefined}
                          onPick={(pid, name) => { if (pid && name) setNames((m) => ({ ...m, [pid]: name })); setRec(i, k, { product_id: pid }); }} />
                      ) : (
                        <div className="grid gap-3 md:grid-cols-3">
                          <F label="Nome do produto" value={r.ext_name} onChange={(v) => setRec(i, k, { ext_name: v ?? "" })} />
                          <F label="Fabricante" value={r.ext_manufacturer} onChange={(v) => setRec(i, k, { ext_manufacturer: v })} />
                          <F label="Modelo" value={r.ext_model} onChange={(v) => setRec(i, k, { ext_model: v })} />
                          <F label="Plataforma / fornecedor" value={r.ext_platform} onChange={(v) => setRec(i, k, { ext_platform: v })} placeholder="Mercado Livre" />
                          <F label="URL original" value={r.ext_original_url} onChange={(v) => setRec(i, k, { ext_original_url: v })} />
                          <F label="URL de afiliado (usada sem alteração)" value={r.ext_affiliate_url} onChange={(v) => setRec(i, k, { ext_affiliate_url: v })} />
                          <F label="Identificação da oferta" value={r.ext_offer_id} onChange={(v) => setRec(i, k, { ext_offer_id: v })} />
                          <F label="Última verificação" type="date" value={r.ext_checked_at} onChange={(v) => setRec(i, k, { ext_checked_at: v })} />
                          <div className="grid gap-1">
                            <Label className="text-xs">Estado do link</Label>
                            <select className={sel} value={r.ext_link_status} onChange={(e) => setRec(i, k, { ext_link_status: e.target.value })}>
                              <option value="ok">Funcionando</option><option value="broken">Quebrado (esconde o botão)</option><option value="unchecked">Não verificado</option>
                            </select>
                          </div>
                          <F label="Texto do botão" value={r.ext_button_text} onChange={(v) => setRec(i, k, { ext_button_text: v })} placeholder="Ver no Mercado Livre" />
                          <F label="Link da imagem (com direito de uso)" value={r.ext_image_url} onChange={(v) => setRec(i, k, { ext_image_url: v })} />
                          <label className="flex items-center gap-2 self-end text-sm"><Switch checked={r.is_affiliate} onCheckedChange={(v) => setRec(i, k, { is_affiliate: v })} /> É link de afiliado</label>
                          <div className="md:col-span-3"><F area label="Descrição" value={r.ext_description} onChange={(v) => setRec(i, k, { ext_description: v })} /></div>
                        </div>
                      )}
                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="grid gap-1">
                          <Label className="text-xs">Tipo de item</Label>
                          <select className={sel} value={r.item_category} onChange={(e) => setRec(i, k, { item_category: e.target.value })}>
                            {ITEM_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </div>
                        <F label="Função na solução" value={r.role} onChange={(v) => setRec(i, k, { role: v })} />
                        <F label="Quantidade sugerida" value={r.quantity} onChange={(v) => setRec(i, k, { quantity: v })} />
                        <F area label="Motivo da recomendação" value={r.reason} onChange={(v) => setRec(i, k, { reason: v })} />
                        <F area label="Observações técnicas / compatibilidade" value={r.notes} onChange={(v) => setRec(i, k, { notes: v })} />
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 text-sm"><Switch checked={r.is_required} onCheckedChange={(v) => setRec(i, k, { is_required: v })} /> Item necessário</label>
                          <ConditionPicker label="Mostrar este item" value={r.show_when} steps={j.steps.slice(0, i + 1)} onChange={(c) => setRec(i, k, { show_when: c })} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={() => setStep(i, { recommendations: [...s.recommendations, newRec()] })}><Plus className="h-4 w-4" /> Adicionar item</Button>
                </div>
              ) : <p className="text-sm text-muted-foreground">Esta etapa mostra automaticamente todos os itens escolhidos nas etapas anteriores.</p>}
            </CardContent>
          </Card>
        ))}
        <Button variant="outline" onClick={() => set({ steps: [...j.steps, newStep()] })}><Plus className="h-4 w-4" /> Adicionar etapa</Button>
      </div>

      {errors.length || (j.status === "published" && pending.length) ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-destructive"><AlertTriangle className="h-4 w-4" /> Antes de publicar, resolva:</p>
          <ul className="mt-2 list-disc pl-5">{(errors.length ? errors : pending).map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 backdrop-blur md:left-60">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Badge variant="outline">{JOURNEY_STATUS[j.status]}</Badge>
          {pending.length ? <span className="text-xs text-muted-foreground">{pending.length} pendência(s) para publicar</span> : <span className="text-xs text-muted-foreground">Pronta para publicar</span>}
          <Button onClick={() => save.mutate(j)} disabled={save.isPending}>{save.isPending ? "Salvando…" : "Salvar"}</Button>
        </div>
      </div>
    </div>
  );
}
