import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, ExternalLink, MessageCircle, Search } from "lucide-react";
import { adminListCatalogLeads } from "@/lib/catalog-leads.functions";
import { describeSearch } from "@/lib/catalog-leads.shared";
import { usePermissions } from "@/hooks/use-permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({
    meta: [
      { title: "Leads do catálogo — Administração Adeconex" },
      { name: "description", content: "Pessoas que salvaram ou compartilharam pesquisas do catálogo." },
      { property: "og:title", content: "Leads do catálogo — Administração Adeconex" },
      { property: "og:description", content: "Pessoas que salvaram ou compartilharam pesquisas do catálogo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LeadsPage,
});

const CH: Record<string, string> = { pdf: "PDF", email: "E-mail", whatsapp: "WhatsApp" };
const fmtPhone = (p: string) => (p.length >= 10 ? `(${p.slice(-11, -9) || p.slice(0, 2)}) ${p.slice(-9, -4)}-${p.slice(-4)}` : p);

function LeadsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "catalog-leads"], queryFn: () => adminListCatalogLeads() });
  const perms = usePermissions();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? []).filter((r: any) => !t || `${r.name} ${r.email} ${r.phone}`.toLowerCase().includes(t));
  }, [data, q]);

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["Data", "Nome", "E-mail", "WhatsApp", "Pesquisa", "Produtos", "Canais"].join(";")].concat(
      rows.map((r: any) => [new Date(r.created_at).toLocaleString("pt-BR"), r.name, r.email, r.phone, describeSearch(r.search_params), r.count, r.channels.map((c: string) => CH[c] ?? c).join(", ")].map(esc).join(";")),
    );
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leads-catalogo.csv";
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Leads do catálogo</h1>
          <p className="text-sm text-muted-foreground">Quem salvou ou compartilhou uma pesquisa do catálogo.</p>
        </div>
        {perms?.canExportCustomers && (
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length} className="gap-2"><Download className="h-4 w-4" /> Exportar CSV</Button>
        )}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar nome, e-mail ou WhatsApp" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead><TableHead>Pessoa</TableHead><TableHead>Pesquisa</TableHead>
                <TableHead>Produtos</TableHead><TableHead>Canais</TableHead><TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6}>Carregando…</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-muted-foreground">Nenhum lead ainda.</TableCell></TableRow>}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell>
                  <TableCell><div className="font-medium">{r.name}</div><div className="text-xs text-muted-foreground">{r.email} · {fmtPhone(r.phone)}</div></TableCell>
                  <TableCell className="max-w-xs text-xs">{describeSearch(r.search_params)}</TableCell>
                  <TableCell>{r.count}</TableCell>
                  <TableCell className="space-x-1">{r.channels.length ? r.channels.map((c: string) => <Badge key={c} variant="secondary">{CH[c] ?? c}</Badge>) : <span className="text-xs text-muted-foreground">só salvou</span>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button asChild size="sm" variant="ghost"><a href={`https://wa.me/${r.phone.length <= 11 ? "55" + r.phone : r.phone}`} target="_blank" rel="noreferrer" aria-label="Chamar no WhatsApp"><MessageCircle className="h-4 w-4" /></a></Button>
                    <Button asChild size="sm" variant="ghost"><a href={`/catalogo/lista/${r.token}`} target="_blank" rel="noreferrer" aria-label="Abrir lista"><ExternalLink className="h-4 w-4" /></a></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
