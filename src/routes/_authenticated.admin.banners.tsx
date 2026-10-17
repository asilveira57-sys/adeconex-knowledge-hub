import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart3, Monitor, Smartphone, ExternalLink, AlertTriangle, CheckCircle2, ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PLACEMENTS, isBannerLive, isExternalUrl, normalizePath, type BannerPlacement, type SiteBanner } from "@/lib/banners.shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/banners")({
  head: () => ({
    meta: [
      { title: "Banners — Administração Adeconex" },
      { name: "description", content: "Gerencie o super banner, banners da página principal e tarjas por página." },
      { property: "og:title", content: "Banners — Administração Adeconex" },
      { property: "og:description", content: "Gerencie o super banner, banners da página principal e tarjas por página." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BannersAdmin,
});

type Edit = Partial<SiteBanner> & { placement: BannerPlacement };
const ORDER: BannerPlacement[] = ["home_hero", "home_secondary", "page_top"];
const toLocal = (iso: string | null | undefined) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "");

function BannersAdmin() {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_banners").select("*").order("sort_order");
      if (error) throw error;
      return data as SiteBanner[];
    },
  });
  const [edit, setEdit] = useState<Edit | null>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin", "banners"] }); qc.invalidateQueries({ queryKey: ["site-banners"] }); };

  const toggle = async (b: SiteBanner) => {
    const { error } = await supabase.from("site_banners").update({ active: !b.active, updated_at: new Date().toISOString() }).eq("id", b.id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const remove = async (b: SiteBanner) => {
    if (!confirm(`Excluir o banner "${b.name || b.alt}"?`)) return;
    const { error } = await supabase.from("site_banners").delete().eq("id", b.id);
    if (error) return toast.error(error.message);
    toast.success("Banner excluído");
    refresh();
  };
  const move = async (list: SiteBanner[], i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= list.length) return;
    const a = list[i], b = list[j];
    await Promise.all([
      supabase.from("site_banners").update({ sort_order: j }).eq("id", a.id),
      supabase.from("site_banners").update({ sort_order: i }).eq("id", b.id),
    ]);
    refresh();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-bold">Banners</h1>
        <p className="text-sm text-muted-foreground">Troque as imagens da página principal e coloque uma tarja no topo de qualquer página. Sem banner ativo, o site mostra a imagem padrão.</p>
      </div>
        <Button variant="outline" size="sm" asChild><Link to="/admin/banners/relatorio"><BarChart3 className="mr-1 h-4 w-4" /> Relatório</Link></Button>
      </div>

      {ORDER.map((pl) => {
        const list = rows.filter((r) => r.placement === pl);
        const info = PLACEMENTS[pl];
        return (
          <section key={pl} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{info.label}</h2>
                <p className="text-xs text-muted-foreground">{info.help} Medida: {info.desktop} · Celular: {info.mobile}.</p>
              </div>
              <Button size="sm" onClick={() => setEdit({ placement: pl, active: true, open_new_tab: false, nofollow: false })}>
                <Plus className="mr-1 h-4 w-4" /> Novo banner
              </Button>
            </div>
            {list.length === 0 ? (
              <p className="rounded-md border border-dashed hairline p-4 text-sm text-muted-foreground">Nenhum banner. O site usa a imagem padrão.</p>
            ) : (
              <div className="grid gap-3">
                {list.map((b, i) => {
                  const live = isBannerLive(b);
                  return (
                    <Card key={b.id}><CardContent className="flex flex-wrap items-center gap-4 p-3">
                      <img src={b.image_desktop_url} alt="" className="h-16 w-28 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{b.name || b.alt}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {pl === "page_top" && <span className="font-mono">{b.page_path} · </span>}
                          {b.link_url ? `→ ${b.link_url}` : "Sem link"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant={live ? "default" : "secondary"}>{live ? "No ar" : b.active ? "Fora do período" : "Desativado"}</Badge>
                          {!b.alt && <Badge variant="destructive">Sem texto alternativo</Badge>}
                          {!b.image_mobile_url && <Badge variant="outline">Sem versão celular</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" aria-label="Subir" onClick={() => move(list, i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" aria-label="Descer" onClick={() => move(list, i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" aria-label={b.active ? "Desativar" : "Ativar"} onClick={() => toggle(b)}>{b.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
                        <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEdit(b)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove(b)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </CardContent></Card>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {edit && <BannerDialog edit={edit} count={rows.filter((r) => r.placement === edit.placement).length} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); refresh(); }} />}
    </div>
  );
}

function BannerDialog({ edit, count, onClose, onSaved }: { edit: Edit; count: number; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Edit>(edit);
  const [busy, setBusy] = useState<string | null>(null);
  const set = (p: Partial<Edit>) => setF((x) => ({ ...x, ...p }));
  const info = PLACEMENTS[f.placement];

  const upload = async (file: File | undefined, field: "image_desktop_url" | "image_mobile_url") => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Escolha um arquivo de imagem.");
    if (file.size > 3 * 1024 * 1024) return toast.error("Use imagens de até 3 MB (o ideal é menos de 300 KB, em WebP ou JPG).");
    setBusy(field);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `banners/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("catalog-media").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      set({ [field]: supabase.storage.from("catalog-media").getPublicUrl(path).data.publicUrl } as Partial<Edit>);
      if (file.size > 400 * 1024) toast.warning("Imagem enviada, mas está pesada. Imagens menores carregam mais rápido e ajudam no Google.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  const save = async () => {
    if (!f.image_desktop_url) return toast.error("Envie a imagem principal.");
    if (!f.alt?.trim()) return toast.error("Preencha o texto alternativo (descrição da imagem).");
    if (f.placement === "page_top" && !normalizePath(f.page_path)) return toast.error("Informe a página onde a tarja aparece, ex.: /catalogo");
    const link = f.link_url?.trim() || null;
    if (link && !/^(\/|https?:\/\/)/.test(link)) return toast.error("O link deve começar com / (página do site) ou https://");
    setBusy("save");
    const payload = {
      placement: f.placement,
      page_path: f.placement === "page_top" ? normalizePath(f.page_path) : null,
      name: f.name?.trim() || f.alt.trim(),
      title: f.title?.trim() || null,
      subtitle: f.subtitle?.trim() || null,
      cta_label: f.cta_label?.trim() || null,
      image_desktop_url: f.image_desktop_url,
      image_mobile_url: f.image_mobile_url || null,
      alt: f.alt.trim(),
      link_url: link,
      open_new_tab: !!f.open_new_tab,
      nofollow: !!f.nofollow,
      active: f.active ?? true,
      starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null,
      ends_at: f.ends_at ? new Date(f.ends_at).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    const q = f.id
      ? supabase.from("site_banners").update(payload).eq("id", f.id)
      : supabase.from("site_banners").insert({ ...payload, sort_order: count });
    const { error } = await q;
    setBusy(null);
    if (error) return toast.error(error.message);
    toast.success("Banner salvo");
    onSaved();
  };

  const ImageField = ({ field, label, hint }: { field: "image_desktop_url" | "image_mobile_url"; label: string; hint: string }) => (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      {f[field] && <img src={f[field] as string} alt="" className="max-h-40 rounded border hairline object-contain" />}
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" asChild>
          <label className="cursor-pointer"><Upload className="mr-1 h-4 w-4" /> {busy === field ? "Enviando..." : f[field] ? "Trocar imagem" : "Enviar imagem"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0], field)} />
          </label>
        </Button>
        {f[field] && field === "image_mobile_url" && <Button type="button" variant="ghost" size="sm" onClick={() => set({ image_mobile_url: null })}>Remover</Button>}
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Editar banner" : "Novo banner"} — {info.label}</DialogTitle></DialogHeader>
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,440px)]">
        <div className="space-y-4">
          <div className="space-y-1.5"><Label>Nome interno (ex.: "Black Friday Ribbons")</Label><Input value={f.name ?? ""} onChange={(e) => set({ name: e.target.value })} /></div>
          {f.placement === "page_top" && (
            <div className="space-y-1.5"><Label>Página onde aparece</Label><Input placeholder="/catalogo" value={f.page_path ?? ""} onChange={(e) => set({ page_path: e.target.value })} /></div>
          )}
          <ImageField field="image_desktop_url" label="Imagem principal (computador)" hint={`Medida recomendada: ${info.desktop}. WebP ou JPG, até 300 KB.`} />
          <ImageField field="image_mobile_url" label="Imagem para celular (opcional)" hint={`Medida recomendada: ${info.mobile}. Sem ela, o celular usa a principal.`} />
          <div className="space-y-1.5">
            <Label>Texto alternativo (alt) — obrigatório</Label>
            <Input value={f.alt ?? ""} maxLength={125} placeholder="Ex.: Rolos de ribbon cera 110 × 74 em promoção" onChange={(e) => set({ alt: e.target.value })} />
            <p className="text-xs text-muted-foreground">Descreva o que aparece na imagem. É lido pelo Google e por leitores de tela. {f.alt?.length ?? 0}/125</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label>Título da imagem (title)</Label><Input value={f.title ?? ""} onChange={(e) => set({ title: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Nome do botão / link (acessibilidade)</Label><Input placeholder="Ver ribbons" value={f.cta_label ?? ""} onChange={(e) => set({ cta_label: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Link de destino</Label>
            <Input placeholder="/catalogo?categoria=ribbon ou https://..." value={f.link_url ?? ""} onChange={(e) => set({ link_url: e.target.value })} />
            <p className="text-xs text-muted-foreground">Use endereços do próprio site (começando com /) sempre que possível — fortalece o SEO interno. Pode incluir UTM.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between gap-3 rounded-md border hairline p-3 text-sm">Abrir em nova aba <Switch checked={!!f.open_new_tab} onCheckedChange={(v) => set({ open_new_tab: v })} /></label>
            <label className="flex items-center justify-between gap-3 rounded-md border hairline p-3 text-sm">Link patrocinado (nofollow) <Switch checked={!!f.nofollow} onCheckedChange={(v) => set({ nofollow: v })} /></label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label>Início (opcional)</Label><Input type="datetime-local" value={toLocal(f.starts_at)} onChange={(e) => set({ starts_at: e.target.value || null })} /></div>
            <div className="space-y-1.5"><Label>Fim (opcional)</Label><Input type="datetime-local" value={toLocal(f.ends_at)} onChange={(e) => set({ ends_at: e.target.value || null })} /></div>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border hairline p-3 text-sm">Banner ativo <Switch checked={f.active ?? true} onCheckedChange={(v) => set({ active: v })} /></label>
        </div>
        <BannerPreview f={f} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!!busy}>{busy === "save" ? "Salvando..." : "Salvar banner"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const FRAME: Record<BannerPlacement, { desktop: string; mobile: string; dw: number; dh: number; mw: number; mh: number }> = {
  home_hero: { desktop: "aspect-[4/5]", mobile: "aspect-[4/5]", dw: 1200, dh: 1500, mw: 1080, mh: 1350 },
  home_secondary: { desktop: "aspect-[4/3]", mobile: "aspect-[4/3]", dw: 1600, dh: 1200, mw: 1080, mh: 810 },
  page_top: { desktop: "aspect-[6/1]", mobile: "aspect-[3/1]", dw: 1920, dh: 320, mw: 1080, mh: 360 },
};

/** Prévia ao vivo do banner como aparece no site, com checagem do destino. */
function BannerPreview({ f }: { f: Edit }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const fr = FRAME[f.placement];
  const mobile = device === "mobile";
  const src = mobile ? f.image_mobile_url || f.image_desktop_url : f.image_desktop_url;
  const usingFallback = mobile && !f.image_mobile_url && !!f.image_desktop_url;
  const link = f.link_url?.trim() || "";
  const validLink = !link || /^(\/|https?:\/\/)/.test(link);
  const ext = isExternalUrl(link);
  const testHref = link.startsWith("/") ? link : link;
  const target = { w: mobile ? fr.mw : fr.dw, h: mobile ? fr.mh : fr.dh };
  const ratioOff = dims ? Math.abs(dims.w / dims.h - target.w / target.h) / (target.w / target.h) > 0.08 : false;
  const small = dims ? dims.w < target.w * 0.6 : false;

  const img = src ? (
    <img key={src} src={src} alt={f.alt || ""} title={f.title || undefined} onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })} className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-muted text-xs text-muted-foreground">Envie a imagem para ver a prévia</div>
  );
  const banner = <div className={`overflow-hidden rounded-md border hairline ${mobile ? fr.mobile : fr.desktop}`}>{img}</div>;

  // Mockup simplificado da página onde o banner aparece
  const page = f.placement === "home_hero" ? (
    <div className={`grid items-center gap-3 rounded-md bg-ink p-3 ${mobile ? "" : "grid-cols-[1.1fr_1fr]"}`}>
      <div className="space-y-1.5">
        <div className="h-1.5 w-12 rounded bg-background/30" />
        <div className="h-3 w-full rounded bg-background/80" /><div className="h-3 w-3/4 rounded bg-primary" />
        <div className="h-1.5 w-5/6 rounded bg-background/30" /><div className="mt-2 h-4 w-16 rounded bg-background" />
      </div>
      <div className={mobile ? "mx-auto w-3/4" : ""}>{banner}</div>
    </div>
  ) : f.placement === "home_secondary" ? (
    <div className={`grid items-center gap-3 rounded-md bg-muted p-3 ${mobile ? "" : "grid-cols-[1fr_1.1fr]"}`}>
      {banner}
      <div className="space-y-1.5"><div className="h-1.5 w-12 rounded bg-foreground/30" /><div className="h-3 w-full rounded bg-foreground/70" /><div className="h-1.5 w-5/6 rounded bg-foreground/20" /><div className="h-1.5 w-4/6 rounded bg-foreground/20" /></div>
    </div>
  ) : (
    <div className="space-y-2">{banner}<div className="grid grid-cols-3 gap-2">{[0, 1, 2].map((i) => <div key={i} className="h-10 rounded bg-muted" />)}</div></div>
  );

  return (
    <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Prévia ao vivo</p>
        <div className="inline-flex rounded-md border hairline p-0.5">
          {([["desktop", Monitor, "Computador"], ["mobile", Smartphone, "Celular"]] as const).map(([k, Icon, l]) => (
            <button key={k} type="button" onClick={() => { setDevice(k); setDims(null); }} aria-pressed={device === k}
              className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs ${device === k ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
              <Icon className="h-3.5 w-3.5" /> {l}
            </button>
          ))}
        </div>
      </div>

      <div className={`mx-auto overflow-hidden rounded-lg border hairline bg-background shadow-sm ${mobile ? "w-[260px] rounded-[1.5rem] border-4" : "w-full"}`}>
        <div className="flex items-center gap-1.5 border-b hairline bg-muted px-2 py-1.5">
          {!mobile && <><span className="h-2 w-2 rounded-full bg-foreground/20" /><span className="h-2 w-2 rounded-full bg-foreground/20" /><span className="h-2 w-2 rounded-full bg-foreground/20" /></>}
          <span className="ml-1 truncate rounded bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            adeconex.com.br{f.placement === "page_top" ? normalizePath(f.page_path) || "/…" : "/"}
          </span>
        </div>
        <div className="h-5 border-b hairline bg-background px-2"><div className="mt-1.5 h-2 w-14 rounded bg-foreground/60" /></div>
        <div className="p-2">{page}</div>
      </div>

      <ul className="space-y-1.5 text-xs">
        {usingFallback && <Check warn>Sem imagem de celular: o celular usará a imagem principal recortada.</Check>}
        {dims && <Check warn={ratioOff || small}>Imagem {dims.w} × {dims.h} px {ratioOff ? `— proporção diferente da recomendada (${target.w} × ${target.h}); as bordas serão cortadas.` : small ? "— resolução baixa, pode ficar borrada." : "— proporção correta."}</Check>}
        <Check warn={!f.alt?.trim()}>{f.alt?.trim() ? `Alt: "${f.alt}"` : "Falta o texto alternativo (alt)."}</Check>
      </ul>

      <div className="space-y-2 rounded-md border hairline p-3 text-xs">
        <p className="font-semibold">Destino do clique</p>
        {!link ? <p className="text-muted-foreground">Sem link — o banner não será clicável.</p> : !validLink ? (
          <p className="flex gap-1 text-destructive"><AlertTriangle className="h-3.5 w-3.5 shrink-0" /> O link deve começar com / ou https://</p>
        ) : (
          <>
            <p className="break-all font-mono">{link.startsWith("/") ? `adeconex.com.br${link}` : link}</p>
            <div className="flex flex-wrap gap-1">
              <Badge variant="outline">{ext ? "Site externo" : "Página do site"}</Badge>
              <Badge variant="outline">{f.open_new_tab ? "Abre em nova aba" : "Abre na mesma aba"}</Badge>
              {f.nofollow && <Badge variant="outline">nofollow</Badge>}
              {ext && !f.open_new_tab && <Badge variant="secondary">Dica: abra externos em nova aba</Badge>}
            </div>
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={testHref} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-1 h-3.5 w-3.5" /> Testar link</a>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function Check({ warn, children }: { warn?: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex gap-1.5 ${warn ? "text-destructive" : "text-muted-foreground"}`}>
      {warn ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}
      <span>{children}</span>
    </li>
  );
}
