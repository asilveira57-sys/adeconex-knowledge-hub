import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CreditCard, Wrench, MessageCircle } from "lucide-react";
import { getCheckoutSnapshot } from "@/lib/checkout.functions";
import { useCheckoutSelection } from "@/hooks/use-checkout";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { SHIPPING_OPTIONS } from "@/lib/checkout.local";

export const Route = createFileRoute("/_authenticated/checkout/pagamento")({
  component: PagamentoStep,
});

function PagamentoStep() {
  const fetchSnap = useServerFn(getCheckoutSnapshot);
  const { data } = useQuery({
    queryKey: ["checkout", "snapshot"],
    queryFn: () => fetchSnap(),
    staleTime: 5_000,
  });
  const { selection } = useCheckoutSelection();
  const shipping = SHIPPING_OPTIONS.find((o) => o.id === selection.shipping_option) ?? null;

  // Build a WhatsApp message so the customer can close the deal manually
  // while Mercado Pago integration (Fase 8) is not yet enabled.
  const waMsg = encodeURIComponent(
    [
      "Olá! Fechei um pedido no site da Adeconex e gostaria de finalizar:",
      "",
      ...(data?.cart.items.map(
        (l) =>
          `• ${l.quantity}× ${l.product_name}${
            l.variant_label ? ` (${l.variant_label})` : ""
          } — ${l.line_total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}`,
      ) ?? []),
      "",
      `Subtotal: ${(data?.cart.subtotal ?? 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}`,
      shipping ? `Entrega: ${shipping.label}` : "",
      selection.customer_notes ? `Observações: ${selection.customer_notes}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-xl border hairline bg-card p-6 shadow-card">
          <header className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Pagamento</h2>
          </header>

          <div className="rounded-lg border hairline border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Wrench className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Pagamento online chega na próxima fase</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Estamos ativando Mercado Pago (Pix, cartão em até 12x e boleto) nos próximos dias.
                  Enquanto isso, você pode finalizar com o comercial pelo WhatsApp — todas as
                  informações do pedido já vão preenchidas.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={`https://wa.me/5527999999999?text=${waMsg}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90"
            >
              <MessageCircle className="h-4 w-4" /> Finalizar via WhatsApp
            </a>
            <Link
              to="/contato"
              className="inline-flex h-11 items-center justify-center rounded-md border hairline bg-card px-6 text-sm font-semibold hover:bg-accent"
            >
              Solicitar cotação por e-mail
            </Link>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            Seus dados de endereço, empresa e itens ficam salvos na sua conta e serão reaproveitados
            quando o pagamento online for ativado.
          </p>
        </section>
      </div>

      <CheckoutSummary
        cart={data?.cart ?? { cart_id: null, currency: "BRL", items: [], subtotal: 0, item_count: 0 }}
        shippingOption={selection.shipping_option}
        ctaLabel="Pagamento em breve"
        ctaDisabled
        ctaReason="Botão liberado na próxima fase, com Mercado Pago ativo."
      />
    </div>
  );
}
