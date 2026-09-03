import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { z } from "zod";
import { XCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import { getOrderPaymentStatus } from "@/lib/payments.functions";
import { restoreCartFromOrder } from "@/lib/cart.functions";

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
  const { session, ready } = useSession();
  const fetchStatus = useServerFn(getOrderPaymentStatus);
  const restoreFn = useServerFn(restoreCartFromOrder);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["order-status", order_id],
    queryFn: () => fetchStatus({ data: { order_id: order_id! } }),
    enabled: !!order_id && ready && !!session,
  });

  const restore = useMutation({
    mutationFn: () => restoreFn({ data: { order_id: order_id! } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["cart", "me"] });
      if (res.restored > 0) {
        toast.success(`${res.restored} item(s) restaurados no carrinho`);
      }
    },
  });

  const didRestore = useRef(false);
  useEffect(() => {
    if (!order_id || !ready || !session || didRestore.current) return;
    didRestore.current = true;
    restore.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order_id, ready, session]);


  return (
    <div className="container-page py-16">
      <div className="mx-auto max-w-xl rounded-xl border hairline bg-card p-8 text-center shadow-card">
        <XCircle className="mx-auto h-14 w-14 text-destructive" />
        <h1 className="mt-4 font-display text-2xl font-semibold">Pagamento não aprovado</h1>
        <p className="mt-2 text-muted-foreground">
          {data?.order_number ? (
            <>
              Pedido <span className="font-mono">{data.order_number}</span> ficou como{" "}
              <strong>aguardando pagamento</strong> e está salvo na sua conta.
            </>
          ) : (
            "O emissor recusou a transação."
          )}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Restauramos os itens no seu carrinho. Você pode tentar outro método (Pix, boleto ou outro
          cartão) ou falar com nossa equipe pelo WhatsApp.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            to="/carrinho"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90"
          >
            Voltar ao carrinho
          </Link>
          <Link
            to="/minha-conta"
            className="inline-flex h-11 items-center justify-center rounded-md border hairline bg-card px-6 text-sm font-semibold hover:bg-accent"
          >
            Ver meus pedidos
          </Link>
        </div>
      </div>
    </div>
  );
}
