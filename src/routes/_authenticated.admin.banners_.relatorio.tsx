import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { getBannerReport } from "@/lib/banner-report.functions";
import { PLACEMENTS, type BannerPlacement } from "@/lib/banners.shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/banners_/relatorio")({
  head: () => ({
    meta: [
      { title: "Relatório de banners — Administração Adeconex" },
      { name: "description", content: "Visualizações, cliques e taxa de cliques dos banners por formato e período." },
      { property: "og:title", content: "Relatório de banners — Administração Adeconex" },
      { property: "og:description", content: "Visualizações, cliques e taxa de cliques dos banners por formato e período." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BannerReport,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const n = (v: number) => v.toLocaleString("pt-BR");
const pct = (v: number) => `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
const plLabel = (p: string) => PLACEMENTS[p as BannerPlacement]?.label ?? p;

function BannerReport() {
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(iso(new Date()));
  const [placement, setPlacement] = useState("");
  const range = { from: new Date(`${from}T00:00:00-03:00`).toISOString(), to: new Date(`${to}T23:59:59-03:00`).toISOString(), placement: placement || undefined };
  const { data, isLoading, error } = useQuery({ queryKey: ["admin", "banner-report", range], queryFn: () => getBannerReport({ data: range }) });
  const preset = (days: number) => { setFrom(iso(new Date(Date.now() - (days - 1) * 86400000))); setTo(iso(new Date())); };
  const bannerInfo = (id: string) => data?.banners.find((b) => b.id === id);
  const maxDay = Math.max(1, ...(data?.byDay.map((d) => d.impressions) ?? [1]));

  const exportCsv = () => {
    if (!data) return;
    const lines = ["Banner;Formato;Visualizações;Cliques;CTR (%)"].concat(
      data.byBanner.map((b) => [bannerInfo(b.banner_id)?.name || "Banner excluído", plLabel(b.placement), b.impressions, b.clicks, String(b.ctr).replace(".", ",")].map((v) => `"${v}"`).join(";")),
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" }));
    a.download = `relatorio-banners-${from}-a-${to}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/admin/banners" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Banners</Link>
          <h1 className="font-display text-2xl font-bold">Relatório de banners</h1>
          <p className="text-sm text-muted-foreground">Visualização conta quando ao menos metade do banner aparece na tela (1 por visita). CTR = cliques ÷ visualizações.</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!data?.byBanner.length}><Download className="mr-1 h-4 w-4" /> Exportar planilha</Button>
      </div>

      <Card><CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
        <div className="space-y-1">
          <Label className="text-xs">Formato</Label>
          <select value={placement} onChange={(e) => setPlacement(e.target.value)} className="h-9 rounded-md border hairline bg-background px-3 text-sm">
            <option value="">Todos</option>
            {Object.entries(PLACEMENTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => <Button key={d} variant="ghost" size="sm" onClick={() => preset(d)}>{d} dias</Button>)}
        </div>
      </CardContent></Card>

      {error && <p className="text-sm text-destructive">Não foi possível carregar o relatório.</p>}
      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[["Visualizações", n(data.total.impressions)], ["Cliques", n(data.total.clicks)], ["CTR", pct(data.total.ctr)]].map(([l, v]) => (
              <Card key={l}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 font-display text-2xl font-semibold">{v}</p></CardContent></Card>
            ))}
          </div>

          <Card><CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold">Por formato</p>
            <Table>
              <TableHeader><TableRow><TableHead>Formato</TableHead><TableHead className="text-right">Visualizações</TableHead><TableHead className="text-right">Cliques</TableHead><TableHead className="text-right">CTR</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.byPlacement.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Sem dados no período.</TableCell></TableRow>}
                {data.byPlacement.map((p) => (
                  <TableRow key={p.placement}><TableCell>{plLabel(p.placement)}</TableCell><TableCell className="text-right">{n(p.impressions)}</TableCell><TableCell className="text-right">{n(p.clicks)}</TableCell><TableCell className="text-right font-medium">{pct(p.ctr)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold">Por banner</p>
            <Table>
              <TableHeader><TableRow><TableHead>Banner</TableHead><TableHead>Formato</TableHead><TableHead className="text-right">Visualizações</TableHead><TableHead className="text-right">Cliques</TableHead><TableHead className="text-right">CTR</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.byBanner.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Sem dados no período.</TableCell></TableRow>}
                {data.byBanner.map((b) => {
                  const info = bannerInfo(b.banner_id);
                  return (
                    <TableRow key={b.banner_id}>
                      <TableCell><div className="flex items-center gap-2">
                        {info?.image_desktop_url && <img src={info.image_desktop_url} alt="" className="h-8 w-14 rounded object-cover" />}
                        <span>{info?.name || info?.alt || "Banner excluído"}{info?.page_path ? <span className="ml-1 font-mono text-xs text-muted-foreground">{info.page_path}</span> : null}</span>
                      </div></TableCell>
                      <TableCell className="text-xs">{plLabel(b.placement)}</TableCell>
                      <TableCell className="text-right">{n(b.impressions)}</TableCell><TableCell className="text-right">{n(b.clicks)}</TableCell><TableCell className="text-right font-medium">{pct(b.ctr)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold">Por dia</p>
            {data.byDay.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados no período.</p> : (
              <div className="space-y-1.5">
                {data.byDay.map((d) => (
                  <div key={d.day} className="grid grid-cols-[80px_1fr_150px] items-center gap-3 text-xs">
                    <span className="font-mono">{d.day.split("-").reverse().slice(0, 2).join("/")}</span>
                    <div className="h-3 rounded bg-muted"><div className="h-3 rounded bg-primary" style={{ width: `${(d.impressions / maxDay) * 100}%` }} /></div>
                    <span className="text-right text-muted-foreground">{n(d.impressions)} vis · {n(d.clicks)} cliq · {pct(d.ctr)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
