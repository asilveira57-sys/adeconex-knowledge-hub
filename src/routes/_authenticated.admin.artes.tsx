import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageOff, Loader2, Search, Send } from "lucide-react";
import { listArtworkOrders, sendArtworkToCustomer } from "@/lib/artwork.functions";
import { ORDER_STATUSES, ORDER_STATUS_LABEL } from "@/lib/orders.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/artes")({
  head: () => ({
    meta: [
      { title: "Artes dos pedidos — Admin Adeconex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminArtesPage,
});

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

function statusTone(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "pago" || s === "entregue" || s === "arte_aprovada") return "default";
  if (s === "cancelado" || s === "estornado") return "destructive";
  if (s === "enviado" || s === "em_producao" || s === "em_preparacao") return "secondary";
  return "outline";
}

function AdminArtesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sendTarget, setSendTarget] = useState<{ id: string; label: string } | null>(null);
  const [note, setNote] = useState("");

  const fetchRows = useServerFn(listArtworkOrders);
  const sendFn = useServerFn(sendArtworkToCustomer);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin", "artes", search, status],
    queryFn: () => fetchRows({ data: { search: search || undefined, status } }),
    staleTime: 15_000,
  });

  const sendArt = useMutation({
    mutationFn: (input: { order_item_id: string; note?: string }) => sendFn({ data: input }),
    onSuccess: () => {
      toast.success("Arte enviada ao cliente para aprovação");
      setSendTarget(null);
      setNote("");
      qc.invalidateQueries({ queryKey: ["admin", "artes"] });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar a arte"),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Artes dos pedidos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cada etiqueta personalizada comprada, com a arte do cliente, quantidade e status.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Pedido, cliente ou nome da arte"
            value={search}
            onChange={(e) => setSearch(e.target.value.slice(0, 120))}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {ORDER_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando artes…
        </div>
      ) : !rows || rows.length === 0 ? (
        <p className="rounded-lg border hairline bg-card p-10 text-center text-sm text-muted-foreground">
          Nenhum pedido com etiqueta personalizada ainda.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((r) => (
            <article key={r.item_id} className="flex flex-col rounded-lg border hairline bg-card shadow-card">
              <div className="flex items-center justify-center border-b hairline bg-surface-2 p-4">
                {r.thumbnail ? (
                  <img
                    src={r.thumbnail}
                    alt={`Arte da etiqueta ${r.design_name ?? r.product_name}`}
                    className="max-h-40 w-auto rounded border hairline bg-background object-contain"
                  />
                ) : (
                  <div className="flex h-40 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                    <ImageOff className="h-6 w-6" />
                    <span className="text-xs">Sem pré-visualização</span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link
                      to="/admin/pedidos/$id"
                      params={{ id: r.order_id }}
                      className="font-mono text-sm font-semibold hover:underline"
                    >
                      {r.order_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {r.customer_name ?? "Cliente"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={statusTone(r.order_status)}>
                    {ORDER_STATUS_LABEL[r.order_status as keyof typeof ORDER_STATUS_LABEL] ??
                      r.order_status}
                  </Badge>
                </div>

                <div className="space-y-1 text-sm">
                  <p className="font-medium">{r.design_name ?? r.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.width_mm && r.height_mm ? `${r.width_mm}×${r.height_mm} mm · ` : ""}
                    {r.material ?? "—"}
                    {r.ribbon_color ? ` · ribbon ${r.ribbon_color}` : ""}
                  </p>
                </div>

                <dl className="grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-3 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Quantidade</dt>
                    <dd className="font-mono text-sm font-semibold">
                      {r.quantity.toLocaleString("pt-BR")} un.
                    </dd>
                  </div>
                  <div className="text-right">
                    <dt className="text-muted-foreground">Total do item</dt>
                    <dd className="font-mono text-sm font-semibold">{brl(r.subtotal)}</dd>
                  </div>
                </dl>

                <div className="mt-auto space-y-2">
                  {r.art_sent_at && (
                    <p className="text-xs text-muted-foreground">
                      Arte enviada em {new Date(r.art_sent_at).toLocaleString("pt-BR")} ·{" "}
                      {r.art_files} arquivo(s)
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!r.thumbnail}
                      onClick={() =>
                        setSendTarget({
                          id: r.item_id,
                          label: `${r.order_number} — ${r.design_name ?? r.product_name}`,
                        })
                      }
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {r.art_sent_at ? "Reenviar arte" : "Enviar arte ao cliente"}
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/admin/pedidos/$id" params={{ id: r.order_id }}>
                        Pedido
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!sendTarget} onOpenChange={(o) => !o && setSendTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar arte ao cliente</DialogTitle>
            <DialogDescription>
              {sendTarget?.label} — a arte fica disponível no pedido do cliente para aprovação.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Mensagem opcional (ex.: confira o texto e a cor do ribbon)"
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={sendArt.isPending}
              onClick={() =>
                sendTarget &&
                sendArt.mutate({ order_item_id: sendTarget.id, note: note.trim() || undefined })
              }
            >
              {sendArt.isPending ? "Enviando…" : "Enviar arte"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
