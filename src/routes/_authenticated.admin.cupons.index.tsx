import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Search, Plus, Copy, Trash2, Pencil, BarChart3, Power } from "lucide-react";
import {
  listAdminCoupons,
  toggleCouponActive,
  duplicateCoupon,
  deleteCoupon,
  listCouponRedemptions,
  COUPON_STATUSES,
  COUPON_STATUS_LABEL,
  type CouponStatus,
} from "@/lib/coupons.admin.functions";
import { CouponEditorDialog } from "@/components/admin/coupon-editor-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const searchSchema = z.object({
  search: z.string().optional(),
  status: z.enum(["ativo", "agendado", "expirado", "esgotado", "inativo"]).optional(),
  page: z.number().int().min(1).default(1),
});

export const Route = createFileRoute("/_authenticated/admin/cupons/")({
  validateSearch: (s) => searchSchema.parse(s),
  component: AdminCuponsPage,
});

const brl = (n: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

const dt = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");

function statusTone(s: CouponStatus): "default" | "destructive" | "secondary" | "outline" {
  if (s === "ativo") return "default";
  if (s === "expirado" || s === "esgotado") return "destructive";
  if (s === "agendado") return "secondary";
  return "outline";
}

type CouponRow = {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  type: "percent" | "fixed" | "free_shipping";
  value: number;
  min_order_amount: number;
  max_discount_per_order: number | null;
  max_total_discount: number | null;
  total_discount_used: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  stack_with_promotions: boolean;
  uses: number;
  status: CouponStatus;
};

const PAGE_SIZE = 25;

function AdminCuponsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const page = search.page ?? 1;

  const [editing, setEditing] = useState<CouponRow | "new" | null>(null);
  const [toDelete, setToDelete] = useState<CouponRow | null>(null);
  const [usageOf, setUsageOf] = useState<CouponRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "coupons", search],
    queryFn: () =>
      listAdminCoupons({
        data: { search: search.search || undefined, status: search.status, page, pageSize: PAGE_SIZE },
      }),
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "coupons"] });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggleCouponActive({ data: v }),
    onSuccess: (_r, v) => {
      invalidate();
      toast.success(v.is_active ? "Cupom ativado." : "Cupom desativado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => duplicateCoupon({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Cupom duplicado (inativo).");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => deleteCoupon({ data: { id } }),
    onSuccess: () => {
      invalidate();
      setToDelete(null);
      toast.success("Cupom excluído.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data?.rows ?? []) as CouponRow[];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow text-xs">Vendas</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Cupons de desconto</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total.toLocaleString("pt-BR")} cupom{total === 1 ? "" : "s"} encontrado{total === 1 ? "" : "s"}.
          </p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="h-4 w-4" /> Criar cupom
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código ou nome"
            className="pl-8"
            defaultValue={search.search ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              window.clearTimeout((window as any).__cupomSearchT);
              (window as any).__cupomSearchT = window.setTimeout(() => {
                navigate({ to: "/admin/cupons", search: { ...search, search: v || undefined, page: 1 } });
              }, 300);
            }}
          />
        </div>
        <div className="w-56">
          <Select
            value={search.status ?? "all"}
            onValueChange={(v) =>
              navigate({
                to: "/admin/cupons",
                search: { ...search, status: v === "all" ? undefined : (v as CouponStatus), page: 1 },
              })
            }
          >
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {COUPON_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>{COUPON_STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cupom</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Utilizações</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow><TableCell colSpan={6} className="py-12 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </TableCell></TableRow>
            )}
            {!isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                Nenhum cupom encontrado.
              </TableCell></TableRow>
            )}
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="font-mono text-sm font-semibold">{c.code}</div>
                  {c.name && <div className="text-xs text-muted-foreground">{c.name}</div>}
                </TableCell>
                <TableCell className="text-sm">
                  {c.type === "percent" ? `${Number(c.value)}%` : brl(c.value)}
                  {c.min_order_amount > 0 && (
                    <div className="text-xs text-muted-foreground">mín. {brl(c.min_order_amount)}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {dt(c.starts_at)} → {dt(c.expires_at)}
                </TableCell>
                <TableCell className="text-sm">
                  {c.uses}{c.max_uses != null ? ` / ${c.max_uses}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={statusTone(c.status)}>{COUPON_STATUS_LABEL[c.status]}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={c.is_active ? "Desativar" : "Ativar"}
                      onClick={() => toggleMut.mutate({ id: c.id, is_active: !c.is_active })}
                    >
                      <Power className={`h-4 w-4 ${c.is_active ? "text-primary" : "text-muted-foreground"}`} />
                    </Button>
                    <Button size="icon" variant="ghost" title="Duplicar" onClick={() => dupMut.mutate(c.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Utilizações" onClick={() => setUsageOf(c)}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={c.uses > 0 ? "Cupom com utilizações não pode ser excluído" : "Excluir"}
                      disabled={c.uses > 0}
                      onClick={() => setToDelete(c)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
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
              onClick={() => navigate({ to: "/admin/cupons", search: { ...search, page: page - 1 } })}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => navigate({ to: "/admin/cupons", search: { ...search, page: page + 1 } })}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {editing && (
        <CouponEditorDialog
          couponId={editing === "new" ? null : editing.id}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); invalidate(); }}
        />
      )}

      {usageOf && <UsageDialog coupon={usageOf} onClose={() => setUsageOf(null)} />}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom {toDelete?.code}?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Cupons já utilizados não podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && delMut.mutate(toDelete.id)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


function UsageDialog({ coupon, onClose }: { coupon: CouponRow; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "coupon-redemptions", coupon.id],
    queryFn: () => listCouponRedemptions({ data: { couponId: coupon.id } }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Utilizações — {coupon.code}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { l: "Utilizações", v: String(data?.stats.uses ?? 0) },
                { l: "Clientes", v: String(data?.stats.customers ?? 0) },
                { l: "Desconto concedido", v: brl(data?.stats.discount_total ?? 0) },
                { l: "Receita gerada", v: brl(data?.stats.revenue_total ?? 0) },
              ].map((s) => (
                <div key={s.l} className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">{s.l}</p>
                  <p className="mt-1 text-lg font-semibold">{s.v}</p>
                </div>
              ))}
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Nenhuma utilização registrada.
                  </TableCell></TableRow>
                )}
                {(data?.rows ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.order_number ?? r.order_id.slice(0, 8)}</TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                    <TableCell className="text-right text-sm">{brl(r.amount)}</TableCell>
                    <TableCell className="text-right text-sm">{brl(r.final_total ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
