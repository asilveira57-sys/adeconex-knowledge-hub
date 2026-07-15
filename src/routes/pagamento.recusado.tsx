import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { XCircle } from "lucide-react";
import { getOrderPaymentStatus } from "@/lib/payments.functions";

export const Route = createFileRoute("/pagamento/recusado")({
  head: () => ({
    meta: [
      { title: "Pagamento recusado — Adeconex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s) =>
    z.object({ order_id: z.string().uuid().optional() }).parse(s),
  component: Recusado,
});

function Recusado() {
  const { order_id } = Route.useSearch();
  const fetchStatus = useServerFn(getOrderPaymentStatus);
  const { data } = useQuery({
    queryKey: ["order-status", order_id],
    queryFn: () => fetchStatus({ data: { order_id: order_id! } }),
    enabled: !!order_id,
  });

  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-xl rounded-xl border hairline bg-card p-8 text-center shadow-card">
        <XCircle className="mx-auto h-14 w-14 text-destructive" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Pagamento não aprovado</h1>
        <p className="mt-2 text-muted-foreground">
          {data?.order_number ? (
            <>Pedido <span className="font-mono">{data.order_number}</span> não foi confirmado pelo emissor.</>
          ) : (
            "O emissor recusou a transação."
          )}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Verifique os dados do cartão, tente outro método (Pix ou boleto) ou fale com nossa
          equipe pelo WhatsApp para concluir o pedido.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/checkout/pagamento"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90"
          >
            Tentar novamente
          </Link>
          <Link
            to="/contato"
            className="inline-flex h-11 items-center justify-center rounded-md border hairline bg-card px-6 text-sm font-semibold hover:bg-accent"
          >
            Falar com o comercial
          </Link>
        </div>
      </div>
    </div>
  );
}
