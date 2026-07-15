import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save, Truck } from "lucide-react";
import {
  getAdminOrder,
  updateOrderStatus,
  updateOrderTracking,
  updateOrderInternalNotes,
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
} from "@/lib/orders.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { OrderFilesCard } from "@/components/order-files-card";
import { IntegrationLogsCard } from "@/components/integration-logs-card";

export const Route = createFileRoute("/_authenticated/admin/pedidos/$id")({
  component: AdminPedidoDetail,
});

const brl = (n: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function statusTone(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "pago" || s === "entregue" || s === "arte_aprovada") return "default";
  if (s === "cancelado" || s === "estornado") return "destructive";
  if (s === "enviado" || s === "em_producao" || s === "em_preparacao") return "secondary";
  return "outline";
}

function AdminPedidoDetail() {
  const { id } = useParams({ from: "/_authenticated/admin/pedidos/$id" });
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: () => getAdminOrder({ data: { orderId: id } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "order", id] });
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
  };

  const statusMut = useMutation({
    mutationFn: (vars: { status: any; comment?: string }) =>
      updateOrderStatus({ data: { orderId: id, status: vars.status, comment: vars.comment } }),
    onSuccess: () => { toast.success("Status atualizado"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const trackMut = useMutation({
    mutationFn: (v: { carrier: string; service?: string; tracking_code: string; tracking_url?: string }) =>
      updateOrderTracking({ data: { orderId: id, ...v } }),
    onSuccess: () => { toast.success("Rastreio salvo"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const notesMut = useMutation({
    mutationFn: (internal_notes: string) => updateOrderInternalNotes({ data: { orderId: id, internal_notes } }),
    onSuccess: () => { toast.success("Anotações salvas"); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (isLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (isError || !data) {
    return <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro"}</p>;
  }

  const { order, items, addresses, history, payments, shipments, customer, company } = data;
  const shipping = addresses.find((a: any) => a.kind === "shipping");
  const payment = payments[0];
  const shipment = shipments[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin/pedidos"><ArrowLeft className="h-4 w-4" /> Pedidos</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Criado em {fmt(order.created_at)}</p>
        </div>
        <div className="text-right">
          <Badge variant={statusTone(order.status)}>{ORDER_STATUS_LABEL[order.status as keyof typeof ORDER_STATUS_LABEL]}</Badge>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{brl(Number(order.total))}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((i: any) => (
                <div key={i.id} className="flex items-start justify-between gap-4 text-sm">
                  <div>
                    <p className="font-medium">{i.product_name}</p>
                    {i.variant_label && <p className="text-xs text-muted-foreground">{i.variant_label}</p>}
                    {i.product_sku && <p className="text-xs text-muted-foreground">SKU: {i.product_sku}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{i.quantity} × {brl(Number(i.unit_price))}</p>
                  </div>
                  <div className="tabular-nums font-medium">{brl(Number(i.subtotal))}</div>
                </div>
              ))}
              <Separator />
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{brl(Number(order.subtotal))}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Frete ({order.shipping_carrier ?? "—"})</span><span className="tabular-nums">{brl(Number(order.shipping_total))}</span></div>
                <div className="flex justify-between font-semibold pt-2 border-t"><span>Total</span><span className="tabular-nums">{brl(Number(order.total))}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Alterar status</CardTitle></CardHeader>
            <CardContent><StatusForm currentStatus={order.status} onSubmit={(s, c) => statusMut.mutate({ status: s, comment: c })} loading={statusMut.isPending} /></CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Rastreio</CardTitle></CardHeader>
            <CardContent>
              <TrackingForm
                initial={shipment ? {
                  carrier: shipment.carrier ?? "",
                  service: shipment.service ?? "",
                  tracking_code: shipment.tracking_code ?? "",
                  tracking_url: shipment.tracking_url ?? "",
                } : null}
                onSubmit={(v) => trackMut.mutate(v)}
                loading={trackMut.isPending}
              />
              {shipment?.posted_at && <p className="mt-2 text-xs text-muted-foreground">Postado em {fmt(shipment.posted_at)}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {history.map((h: any) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <p><span className="font-medium">{ORDER_STATUS_LABEL[h.to_status as keyof typeof ORDER_STATUS_LABEL]}</span> <span className="text-muted-foreground">· {fmt(h.created_at)}</span></p>
                      {h.comment && <p className="text-muted-foreground">{h.comment}</p>}
                    </div>
                  </li>
                ))}
                {history.length === 0 && <p className="text-muted-foreground">Sem histórico.</p>}
              </ol>
            </CardContent>
          </Card>

          <OrderFilesCard orderId={order.id} staff={true} />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <p className="font-medium">{customer?.full_name ?? "—"}</p>
              {customer?.email && <p className="text-muted-foreground">{customer.email}</p>}
              {customer?.phone && <p className="text-muted-foreground">Tel: {customer.phone}</p>}
              {customer?.whatsapp && <p className="text-muted-foreground">WhatsApp: {customer.whatsapp}</p>}
              {customer?.cpf && <p className="text-muted-foreground">CPF: {customer.cpf}</p>}
              {company && (
                <>
                  <Separator className="my-2" />
                  <p className="font-medium">{company.trade_name ?? company.legal_name}</p>
                  <p className="text-muted-foreground">CNPJ: {company.cnpj}</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Entrega</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {shipping ? (
                <>
                  <p className="font-medium">{shipping.recipient_name}</p>
                  {shipping.recipient_document && <p className="text-muted-foreground">{shipping.recipient_document}</p>}
                  <p>{shipping.street}, {shipping.number}{shipping.complement ? ` — ${shipping.complement}` : ""}</p>
                  <p>{shipping.district} — {shipping.city}/{shipping.state}</p>
                  <p className="text-muted-foreground">CEP {shipping.zip}</p>
                </>
              ) : <p className="text-muted-foreground">Sem endereço.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Pagamento</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {payment ? (
                <>
                  <p className="font-medium capitalize">{payment.provider}</p>
                  <p className="text-muted-foreground">Status: {payment.status}</p>
                  <p className="text-muted-foreground">Valor: {brl(Number(payment.amount))}</p>
                  {payment.external_id && <p className="text-muted-foreground">ID: {payment.external_id}</p>}
                  {order.paid_at && <p className="text-muted-foreground">Confirmado em {fmt(order.paid_at)}</p>}
                </>
              ) : <p className="text-muted-foreground">Sem pagamento registrado.</p>}
            </CardContent>
          </Card>

          <IntegrationLogsCard orderId={order.id} />

          <Card>
            <CardHeader><CardTitle className="text-base">Anotações internas</CardTitle></CardHeader>
            <CardContent>
              <NotesForm initial={order.internal_notes ?? ""} onSubmit={(v) => notesMut.mutate(v)} loading={notesMut.isPending} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusForm({ currentStatus, onSubmit, loading }: { currentStatus: string; onSubmit: (s: string, c?: string) => void; loading: boolean }) {
  const [status, setStatus] = useState(currentStatus);
  const [comment, setComment] = useState("");
  return (
    <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={(e) => { e.preventDefault(); onSubmit(status, comment || undefined); setComment(""); }}>
      <div className="grid gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea placeholder="Comentário (opcional)" value={comment} onChange={(e) => setComment(e.target.value)} rows={2} />
      </div>
      <Button type="submit" disabled={loading || status === currentStatus} className="self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar
      </Button>
    </form>
  );
}

function TrackingForm({ initial, onSubmit, loading }: { initial: { carrier: string; service: string; tracking_code: string; tracking_url: string } | null; onSubmit: (v: any) => void; loading: boolean }) {
  const [carrier, setCarrier] = useState(initial?.carrier ?? "");
  const [service, setService] = useState(initial?.service ?? "");
  const [tracking_code, setCode] = useState(initial?.tracking_code ?? "");
  const [tracking_url, setUrl] = useState(initial?.tracking_url ?? "");
  return (
    <form className="grid gap-3 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      onSubmit({ carrier, service: service || undefined, tracking_code, tracking_url: tracking_url || undefined });
    }}>
      <div><Label>Transportadora</Label><Input required value={carrier} onChange={(e) => setCarrier(e.target.value)} /></div>
      <div><Label>Serviço</Label><Input value={service} onChange={(e) => setService(e.target.value)} /></div>
      <div><Label>Código de rastreio</Label><Input required value={tracking_code} onChange={(e) => setCode(e.target.value)} /></div>
      <div><Label>URL de rastreio</Label><Input type="url" value={tracking_url} onChange={(e) => setUrl(e.target.value)} /></div>
      <Button type="submit" disabled={loading} className="sm:col-span-2 justify-self-start">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar rastreio
      </Button>
    </form>
  );
}

function NotesForm({ initial, onSubmit, loading }: { initial: string; onSubmit: (v: string) => void; loading: boolean }) {
  const [v, setV] = useState(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(v); }}>
      <Textarea value={v} onChange={(e) => setV(e.target.value)} rows={4} placeholder="Visível apenas para o time." />
      <Button type="submit" size="sm" className="mt-2" disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
      </Button>
    </form>
  );
}
