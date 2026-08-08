import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { Loader2, Search } from "lucide-react";
import { listAdminOrders, ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/orders.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const searchSchema = z.object({
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.number().int().min(1).default(1),
});

export const Route = createFileRoute("/_authenticated/admin/pedidos/")({
  validateSearch: (s?: Partial<z.input<typeof searchSchema>>) => searchSchema.parse(s ?? {}),
  component: AdminPedidosPage,
});

const brl = (n: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

function statusTone(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "pago" || s === "entregue" || s === "arte_aprovada") return "default";
  if (s === "cancelado" || s === "estornado") return "destructive";
  if (s === "enviado" || s === "em_producao" || s === "em_preparacao") return "secondary";
  return "outline";
}

function AdminPedidosPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const page = search.page ?? 1;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "orders", search],
    queryFn: () =>
      listAdminOrders({
        data: {
          search: search.search || undefined,
          status: search.status || undefined,
          page,
          pageSize: 25,
        },
      }),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <div>
        <p className="eyebrow text-xs">Vendas</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total.toLocaleString("pt-BR")} pedido{total === 1 ? "" : "s"}.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número (ADC-…)"
            className="pl-8"
            defaultValue={search.search ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              const t = setTimeout(() => {
                navigate({ to: "/admin/pedidos", search: { ...search, search: v || undefined, page: 1 } });
              }, 300);
              return () => clearTimeout(t);
            }}
          />
        </div>
        <div className="w-56">
          <Select
            value={search.status ?? "all"}
            onValueChange={(v) =>
              navigate({ to: "/admin/pedidos", search: { ...search, status: v === "all" ? undefined : v, page: 1 } })
            }
          >
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {ORDER_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={5} className="py-12 text-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-auto" />
              </TableCell></TableRow>
            )}
            {!isLoading && data?.rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-12 text-center text-sm text-muted-foreground">
                Nenhum pedido encontrado.
              </TableCell></TableRow>
            )}
            {(data?.rows ?? []).map((o: any) => (
              <TableRow key={o.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <Link to="/admin/pedidos/$id" params={{ id: o.id }} className="font-medium hover:underline">
                    {o.order_number}
                  </Link>
                  {o.requires_art && <Badge variant="outline" className="ml-2">arte</Badge>}
                </TableCell>
                <TableCell className="text-sm">{o.customer_name ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </TableCell>
                <TableCell>
                  <Badge variant={statusTone(o.status)}>{ORDER_STATUS_LABEL[o.status as keyof typeof ORDER_STATUS_LABEL]}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">{brl(o.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => navigate({ to: "/admin/pedidos", search: { ...search, page: page - 1 } })}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => navigate({ to: "/admin/pedidos", search: { ...search, page: page + 1 } })}>
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
