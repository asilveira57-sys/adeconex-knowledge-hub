import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listReviewInvites } from "@/lib/reviews.functions";

const LABEL = { aguardando: "Pendente", enviado: "Enviado", lembrete: "Lembrete enviado", respondido: "Respondido", expirado: "Expirado" } as const;
type Filter = "todos" | "aguardando" | "enviados" | "respondido";
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");

export function ReviewInvites() {
  const fn = useServerFn(listReviewInvites);
  const { data, isLoading } = useQuery({ queryKey: ["admin", "reviews", "invites"], queryFn: () => fn() });
  const [f, setF] = useState<Filter>("todos");
  const rows = (data ?? []).filter((r) =>
    f === "todos" ? true : f === "enviados" ? ["enviado", "lembrete", "expirado"].includes(r.status) : r.status === f);
  const count = (k: Filter) => (data ?? []).filter((r) => k === "todos" || (k === "enviados" ? ["enviado", "lembrete", "expirado"].includes(r.status) : r.status === k)).length;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-display text-lg font-semibold">Convites de avaliação</h2>
          <p className="text-sm text-muted-foreground">Pendentes saem 7 dias após a entrega; o lembrete vai 7 dias depois do convite.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([["todos", "Todos"], ["aguardando", "Pendentes"], ["enviados", "Enviados"], ["respondido", "Respondidos"]] as [Filter, string][]).map(([k, l]) => (
            <Button key={k} size="sm" variant={f === k ? "default" : "outline"} onClick={() => setF(k)}>{l} ({count(k)})</Button>
          ))}
        </div>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
        {data && !rows.length ? <p className="text-sm text-muted-foreground">Nenhum convite aqui.</p> : null}
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="py-2 pr-3">Pedido</th><th className="pr-3">Status</th><th className="pr-3">Entregue</th><th className="pr-3">Convite</th><th className="pr-3">Lembrete</th><th>Respondido</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t hairline">
                    <td className="py-2 pr-3 font-medium">{r.orderNumber}</td>
                    <td className="pr-3"><Badge variant={r.status === "respondido" ? "default" : r.status === "expirado" ? "destructive" : "secondary"}>{LABEL[r.status]}</Badge></td>
                    <td className="pr-3 tabular-nums">{fmt(r.deliveredAt)}</td>
                    <td className="pr-3 tabular-nums">{r.sentAt ? fmt(r.sentAt) : <span className="text-muted-foreground">previsto {fmt(r.date)}</span>}</td>
                    <td className="pr-3 tabular-nums">{fmt(r.reminderAt)}</td>
                    <td className="tabular-nums">{fmt(r.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
