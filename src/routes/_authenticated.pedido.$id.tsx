import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Package, MapPin, CreditCard, Truck, Clock } from "lucide-react";
import { getMyOrder } from "@/lib/orders.functions";
import { ORDER_STATUS_LABEL } from "@/lib/orders.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_authenticated/pedido/$id")({
  head: () => ({
    meta: [
      { title: "Pedido — Adeconex" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PedidoPage,
});

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function statusTone(s: string) {
  if (s === "pago" || s === "arte_aprovada" || s === "entregue") return "default";
  if (s === "cancelado" || s === "estornado") return "destructive";
  if (s === "enviado" || s === "em_producao" || s === "em_preparacao") return "secondary";
  return "outline";
}

function PedidoPage() {
  const { id } = useParams({ from: "/_authenticated/pedido/$id" });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["orders", "me", id],
    queryFn: () => getMyOrder({ data: { orderId: id } }),
  });

  if (isLoading) {
    return (
      <div className="container-page py-16 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="container-page py-16">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Erro ao carregar pedido"}
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/minha-conta">Voltar</Link>
        </Button>
      </div>
    );
  }

  const { order, items, addresses, history, payments, shipments } = data;
  const shipping = addresses.find((a) => a.kind === "shipping");
  const payment = payments[0];
  const shipment = shipments[0];

  return (
    <div className="container-page py-10 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/minha-conta"><ArrowLeft className="h-4 w-4" /> Minha conta</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Pedido {order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Criado em {fmt(order.created_at)}</p>
        </div>
        <div className="text-right">
          <Badge variant={statusTone(order.status) as any}>{ORDER_STATUS_LABEL[order.status]}</Badge>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{brl(Number(order.total))}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> Itens</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {items.map((i) => (
                <div key={i.id} className="flex items-start justify-between gap-4 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{i.product_name}</p>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span className="tabular-nums">{brl(Number(order.shipping_total))}</span></div>
                {Number(order.discount_total) > 0 && (
                  <div className="flex justify-between text-green-700"><span>Desconto</span><span className="tabular-nums">-{brl(Number(order.discount_total))}</span></div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t"><span>Total</span><span className="tabular-nums">{brl(Number(order.total))}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Histórico</CardTitle></CardHeader>
            <CardContent>
              <ol className="space-y-3 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    <div>
                      <p><span className="font-medium">{ORDER_STATUS_LABEL[h.to_status]}</span> <span className="text-muted-foreground">· {fmt(h.created_at)}</span></p>
                      {h.comment && <p className="text-muted-foreground">{h.comment}</p>}
                    </div>
                  </li>
                ))}
                {history.length === 0 && <p className="text-muted-foreground">Sem histórico registrado.</p>}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Entrega</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {shipping ? (
                <>
                  <p className="font-medium">{shipping.recipient_name}</p>
                  <p>{shipping.street}, {shipping.number}{shipping.complement ? ` — ${shipping.complement}` : ""}</p>
                  <p>{shipping.district} — {shipping.city}/{shipping.state}</p>
                  <p className="text-muted-foreground">CEP {shipping.zip}</p>
                </>
              ) : <p className="text-muted-foreground">—</p>}
              {order.shipping_carrier && (
                <p className="mt-2 text-muted-foreground">{order.shipping_carrier} {order.shipping_service ? `· ${order.shipping_service}` : ""}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Pagamento</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {payment ? (
                <>
                  <p className="font-medium capitalize">{payment.provider}</p>
                  <p className="text-muted-foreground">Status: {payment.status}</p>
                  <p className="text-muted-foreground">Valor: {brl(Number(payment.amount))}</p>
                  {order.paid_at && <p className="text-muted-foreground">Confirmado em {fmt(order.paid_at)}</p>}
                </>
              ) : <p className="text-muted-foreground">Sem pagamento registrado.</p>}
            </CardContent>
          </Card>

          {shipment && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> Envio</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="font-medium">{shipment.carrier ?? "—"} {shipment.service ? `· ${shipment.service}` : ""}</p>
                {shipment.tracking_code && (
                  <p>
                    Código: <span className="font-mono">{shipment.tracking_code}</span>
                  </p>
                )}
                {shipment.tracking_url && (
                  <a className="text-primary underline" href={shipment.tracking_url} target="_blank" rel="noreferrer">
                    Rastrear
                  </a>
                )}
                {shipment.posted_at && <p className="text-muted-foreground">Postado em {fmt(shipment.posted_at)}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
