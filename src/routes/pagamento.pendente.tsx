import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Clock } from "lucide-react";
import { useSession } from "@/hooks/use-session";
import { getOrderPaymentStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/pagamento/pendente")({
  head: () => ({
    meta: [
      { title: "Pagamento pendente — Adeconex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s) =>
    z.object({ order_id: z.string().uuid().optional() }).parse(s),
  component: Pendente,
});

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Pendente() {
  const { order_id } = Route.useSearch();
  const { session, ready } = useSession();
  const fetchStatus = useServerFn(getOrderPaymentStatus);
  const { data } = useQuery({
    queryKey: ["order-status", order_id],
    queryFn: () => fetchStatus({ data: { order_id: order_id! } }),
    enabled: !!order_id && ready && !!session,
    refetchInterval: 5000,
  });

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-xl rounded-xl border hairline bg-card p-8 text-center shadow-card">
        <Clock className="mx-auto h-14 w-14 text-amber-500" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Pagamento pendente</h1>
        <p className="mt-2 text-muted-foreground">
          {data?.order_number ? (
            <>Pedido <span className="font-mono">{data.order_number}</span> — {money(data.total)}</>
          ) : (
            "Aguardando confirmação do Mercado Pago."
          )}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Se você escolheu Pix ou boleto, conclua o pagamento pelo link do Mercado Pago. Assim que
          o banco confirmar, o pedido avança automaticamente. Esta página atualiza sozinha.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/minha-conta"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90"
          >
            Ver meus pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}
