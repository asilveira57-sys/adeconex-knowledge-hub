import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Download, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { listAdminCustomers, exportAdminCustomers } from "@/lib/customers.functions";
import { usePermissions } from "@/hooks/use-permissions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const searchSchema = z.object({
  search: z.string().optional(),
  type: z.enum(["all", "pf", "pj"]).optional(),
  missing: z.enum(["all", "cpf", "cnpj", "telefone", "complete"]).optional(),
  sort: z.enum(["recent", "name", "orders", "total"]).optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/_authenticated/admin/clientes/")({
  validateSearch: (s?: Partial<z.input<typeof searchSchema>>) => searchSchema.parse(s ?? {}),
  head: () => ({
    meta: [
      { title: "Clientes — Administração Adeconex" },
      { name: "description", content: "Gestão de clientes PF e PJ da loja Adeconex." },
      { property: "og:title", content: "Clientes — Administração Adeconex" },
      { property: "og:description", content: "Gestão de clientes PF e PJ da loja Adeconex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminClientesPage,
});

const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n || 0);
const MISSING_LABEL: Record<string, string> = { cpf: "Sem CPF", cnpj: "Sem CNPJ", telefone: "Sem telefone" };

function AdminClientesPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [q, setQ] = useState(s.search ?? "");
  const [exporting, setExporting] = useState(false);
  const perms = usePermissions();
  const filters = {
    search: s.search || undefined,
    type: s.type ?? "all",
    missing: s.missing ?? "all",
    sort: s.sort ?? "recent",
  } as const;
  const page = s.page ?? 1;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers", filters, page],
    queryFn: () => listAdminCustomers({ data: { ...filters, page, pageSize: 25 } }),
    placeholderData: keepPreviousData,
  });

  const set = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev: any) => ({ ...prev, ...patch, page: 1 }) });

  const doExport = async () => {
    setExporting(true);
    try {
      const r = await exportAdminCustomers({ data: filters });
      const url = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `clientes-adeconex-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${r.count} clientes exportados`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar");
    } finally {
      setExporting(false);
    }
  };

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));
  const st = data?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <p className="text-sm text-muted-foreground">Cadastros, empresas, pendências e histórico de compras.</p>
        </div>
        {perms?.canExportCustomers && (
          <Button variant="outline" onClick={doExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar CSV
          </Button>
        )}
      </div>

      {st && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { l: "Clientes", v: st.total, f: {} },
            { l: "Pessoa jurídica", v: st.pj, f: { type: "pj" as const } },
            { l: "Sem CPF", v: st.missingCpf, f: { missing: "cpf" as const } },
            { l: "PJ sem CNPJ", v: st.missingCnpj, f: { missing: "cnpj" as const } },
          ].map((c) => (
            <button key={c.l} className="text-left" onClick={() => set({ type: undefined, missing: undefined, ...c.f })}>
              <Card className="hover:border-primary">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground">{c.l}</div>
                  <div className="text-2xl font-semibold">{c.v}</div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <form
          className="flex flex-1 min-w-64 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ search: q || undefined });
          }}
        >
          <Input placeholder="Nome, e-mail, CPF, CNPJ, razão social, telefone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button type="submit" variant="secondary"><Search className="h-4 w-4" /></Button>
        </form>
        <Select value={filters.type} onValueChange={(v) => set({ type: v as any })}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">PF e PJ</SelectItem>
            <SelectItem value="pf">Pessoa física</SelectItem>
            <SelectItem value="pj">Pessoa jurídica</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.missing} onValueChange={(v) => set({ missing: v as any })}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cadastros</SelectItem>
            <SelectItem value="complete">Cadastro completo</SelectItem>
            <SelectItem value="cpf">Sem CPF</SelectItem>
            <SelectItem value="cnpj">PJ sem CNPJ</SelectItem>
            <SelectItem value="telefone">Sem telefone</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(v) => set({ sort: v as any })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="name">Nome (A-Z)</SelectItem>
            <SelectItem value="orders">Mais pedidos</SelectItem>
            <SelectItem value="total">Maior valor pago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Documentos</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead className="text-right">Pedidos</TableHead>
              <TableHead className="text-right">Total pago</TableHead>
              <TableHead>Pendências</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
            ) : (data?.rows ?? []).length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum cliente encontrado.</TableCell></TableRow>
            ) : (
              data!.rows.map((r) => (
                <TableRow key={r.id} className="cursor-pointer" onClick={() => navigate({ to: "/admin/clientes/$id", params: { id: r.id } })}>
                  <TableCell>
                    <Link to="/admin/clientes/$id" params={{ id: r.id }} className="font-medium hover:underline">
                      {r.full_name || "(sem nome)"}
                    </Link>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                    {r.companies[0] && <div className="text-xs">{r.companies[0].legal_name}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge variant="outline" className="mb-1">{r.customer_type.toUpperCase()}</Badge>
                    <div>CPF: {r.cpf || "—"}</div>
                    {r.companies.map((c) => <div key={c.cnpj}>CNPJ: {c.cnpj}</div>)}
                  </TableCell>
                  <TableCell className="text-xs">{r.whatsapp || r.phone || "—"}</TableCell>
                  <TableCell className="text-right">{r.orders_count}</TableCell>
                  <TableCell className="text-right">{brl(r.paid_total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.missing.length === 0 ? (
                        <Badge variant="secondary">Completo</Badge>
                      ) : (
                        r.missing.map((m) => <Badge key={m} variant="destructive">{MISSING_LABEL[m]}</Badge>)
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{total} clientes</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => navigate({ search: (p: any) => ({ ...p, page: page - 1 }) })}>Anterior</Button>
          <span>{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => navigate({ search: (p: any) => ({ ...p, page: page + 1 }) })}>Próxima</Button>
        </div>
      </div>
    </div>
  );
}
