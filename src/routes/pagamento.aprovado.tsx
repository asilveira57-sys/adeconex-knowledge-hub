import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { getOrderPaymentStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/pagamento/aprovado")({
  head: () => ({
    meta: [
      { title: "Pagamento aprovado — Adeconex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s) =>
    z.object({ order_id: z.string().uuid().optional() }).parse(s),
  component: Aprovado,
});

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Aprovado() {
  const { order_id } = Route.useSearch();
  const fetchStatus = useServerFn(getOrderPaymentStatus);
  const { data, isLoading } = useQuery({
    queryKey: ["order-status", order_id],
    queryFn: () => fetchStatus({ data: { order_id: order_id! } }),
    enabled: !!order_id,
    refetchInterval: (q) =>
      q.state.data?.payment_status === "approved" ||
      q.state.data?.status === "pago"
        ? false
        : 4000,
  });

  const approved = data?.payment_status === "approved" || data?.status === "pago";

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-xl rounded-xl border hairline bg-card p-8 text-center shadow-card">
        {approved ? (
          <>
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-600" />
            <h1 className="mt-4 font-display text-2xl font-semibold">Pagamento aprovado</h1>
            <p className="mt-2 text-muted-foreground">
              Pedido <span className="font-mono">{data?.order_number}</span> —{" "}
              {money(data?.total ?? 0)}
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Já estamos preparando o seu pedido. Você pode acompanhar tudo pela sua conta.
            </p>
          </>
        ) : (
          <>
            {isLoading ? (
              <Loader2 className="mx-auto h-14 w-14 animate-spin text-primary" />
            ) : (
              <Clock className="mx-auto h-14 w-14 text-amber-500" />
            )}
            <h1 className="mt-4 font-display text-2xl font-semibold">
              Confirmando o pagamento…
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              O Mercado Pago está confirmando com o emissor. Esta página atualiza sozinha.
            </p>
          </>
        )}

        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/minha-conta"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90"
          >
            Ver meus pedidos
          </Link>
          <Link
            to="/catalogo"
            className="inline-flex h-11 items-center justify-center rounded-md border hairline bg-card px-6 text-sm font-semibold hover:bg-accent"
          >
            Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
