import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CreditCard, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { getCheckoutSnapshot } from "@/lib/checkout.functions";
import { createOrderAndPreference } from "@/lib/payments.functions";
import { useCheckoutSelection } from "@/hooks/use-checkout";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { FALLBACK_SHIPPING, clearCheckout } from "@/lib/checkout.local";

export const Route = createFileRoute("/_authenticated/checkout/pagamento")({
  component: PagamentoStep,
});

function PagamentoStep() {
  const fetchSnap = useServerFn(getCheckoutSnapshot);
  const createPref = useServerFn(createOrderAndPreference);
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["checkout", "snapshot"],
    queryFn: () => fetchSnap(),
    staleTime: 5_000,
  });
  const { selection } = useCheckoutSelection();
  const [notes, setNotes] = useState(selection.customer_notes ?? "");

  const shippingLabel =
    selection.shipping_option === "carrier" && selection.shipping_snapshot
      ? `${selection.shipping_snapshot.carrier} · ${selection.shipping_snapshot.service_name}`
      : FALLBACK_SHIPPING.find((o) => o.id === selection.shipping_option)?.label ?? null;

  const canPay = !!(
    selection.address_id &&
    selection.shipping_option &&
    (selection.shipping_option !== "carrier" || selection.shipping_snapshot?.quote_id)
  );

  const mutation = useMutation({
    mutationFn: () =>
      createPref({
        data: {
          address_id: selection.address_id!,
          billing_company_id: selection.billing_company_id ?? null,
          shipping_option: selection.shipping_option!,
          shipping_quote_id: selection.shipping_snapshot?.quote_id ?? null,
          customer_notes: notes,
          origin: typeof window !== "undefined" ? window.location.origin : undefined,
        },
      }),
    onSuccess: (res) => {
      clearCheckout();
      // sandbox_init_point quando token for de teste; caso contrário init_point (produção)
      const target = res.sandbox_init_point ?? res.init_point;
      window.location.href = target;
    },
    onError: (err: any) => {
      const msg = err?.message ?? "Não foi possível iniciar o pagamento";
      console.error("[checkout] createOrderAndPreference failed:", err);
      toast.error(msg, { duration: 8000 });
    },
  });

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
      shippingLabel ? `Entrega: ${shippingLabel}` : "",
      notes ? `Observações: ${notes}` : "",
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

          <div className="rounded-lg border hairline bg-surface-2 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Checkout seguro Mercado Pago</p>
                <p className="mt-1 text-muted-foreground">
                  Pague com Pix, cartão em até 12x ou boleto. Você é redirecionado para o
                  ambiente do Mercado Pago para concluir com segurança. Ao voltar, o pedido
                  aparece automaticamente na sua conta.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-sm font-medium" htmlFor="notes">
              Observações para o pedido (opcional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full rounded-md border hairline bg-background p-3 text-sm outline-none focus:border-primary"
              placeholder="Ex.: entregar em horário comercial, cuidados especiais…"
            />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={!canPay || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparando…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Pagar com Mercado Pago
                </>
              )}
            </button>
            <a
              href={`https://wa.me/5527999999999?text=${waMsg}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md border hairline bg-card px-6 text-sm font-semibold hover:bg-accent"
            >
              <MessageCircle className="h-4 w-4" /> Preferir WhatsApp
            </a>
          </div>

          {!canPay && (
            <p className="mt-3 text-xs text-muted-foreground">
              Complete as etapas de endereço e frete antes de pagar.{" "}
              <button
                type="button"
                onClick={() => navigate({ to: "/checkout/endereco" })}
                className="underline"
              >
                Voltar ao início
              </button>
              .
            </p>
          )}

          <p className="mt-4 text-xs text-muted-foreground">
            Ao confirmar, criamos o pedido como <strong>aguardando pagamento</strong>. Ele
            avança automaticamente para <strong>pago</strong> assim que o Mercado Pago
            confirmar a transação — nada é despachado antes disso.
          </p>
        </section>

        <p className="text-xs text-muted-foreground">
          Prefere só cotar?{" "}
          <Link to="/contato" className="underline">
            Solicite uma cotação por e-mail
          </Link>
          .
        </p>
      </div>

      <CheckoutSummary
        cart={data?.cart ?? emptyCartSnapshot()}
        selection={selection}
        ctaLabel={mutation.isPending ? "Preparando…" : "Pagar com Mercado Pago"}
        ctaDisabled={!canPay || mutation.isPending}
        ctaReason={!canPay ? "Complete endereço e frete para liberar o pagamento." : null}
        onCta={() => mutation.mutate()}
      />
    </div>
  );
}
