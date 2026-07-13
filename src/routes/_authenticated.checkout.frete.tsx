import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Truck, Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCheckoutSnapshot } from "@/lib/checkout.functions";
import { useCheckoutSelection } from "@/hooks/use-checkout";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { SHIPPING_OPTIONS } from "@/lib/checkout.local";

export const Route = createFileRoute("/_authenticated/checkout/frete")({
  component: FreteStep,
});

function FreteStep() {
  const fetchSnap = useServerFn(getCheckoutSnapshot);
  const { data } = useQuery({
    queryKey: ["checkout", "snapshot"],
    queryFn: () => fetchSnap(),
    staleTime: 10_000,
  });
  const { selection, update } = useCheckoutSelection();
  const navigate = useNavigate();
  const canContinue = !!selection.shipping_option && !!selection.address_id;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-xl border hairline bg-card p-6 shadow-card">
          <header className="mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold">Modalidade de entrega</h2>
          </header>

          <p className="mb-4 text-sm text-muted-foreground">
            Em breve integraremos cotações automáticas via Melhor Envio. Enquanto isso, escolha uma
            das opções abaixo — o comercial confirma valores e prazo por WhatsApp.
          </p>

          <ul className="space-y-3">
            {SHIPPING_OPTIONS.map((opt) => {
              const active = selection.shipping_option === opt.id;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => update({ shipping_option: opt.id })}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border hairline bg-card p-4 text-left transition hover:border-primary/40",
                      active && "border-primary/60 ring-1 ring-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border hairline",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40",
                      )}
                    >
                      {active && <Check className="h-3 w-3" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{opt.label}</span>
                        <span className="text-sm font-semibold tabular-nums">
                          {opt.price === 0
                            ? "A confirmar"
                            : opt.price.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{opt.description}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {opt.deadline}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border hairline bg-card p-6 shadow-card">
          <header className="mb-3">
            <h2 className="font-display text-lg font-semibold">Observações</h2>
            <p className="text-sm text-muted-foreground">
              Instruções de entrega, horário preferencial, etc. (opcional)
            </p>
          </header>
          <textarea
            value={selection.customer_notes}
            onChange={(e) => update({ customer_notes: e.target.value.slice(0, 500) })}
            rows={3}
            placeholder="Ex.: entregar em horário comercial, portaria com Sr. João…"
            className="w-full rounded-md border hairline bg-surface-1 p-3 text-sm outline-none focus:border-primary/50"
          />
          <div className="mt-1 text-right text-xs text-muted-foreground">
            {selection.customer_notes.length}/500
          </div>
        </section>
      </div>

      <CheckoutSummary
        cart={data?.cart ?? { cart_id: null, currency: "BRL", items: [], subtotal: 0, item_count: 0 }}
        shippingOption={selection.shipping_option}
        ctaLabel="Revisar pedido"
        ctaDisabled={!canContinue}
        ctaReason={
          canContinue
            ? null
            : selection.address_id
              ? "Selecione uma modalidade de entrega."
              : "Volte e selecione um endereço."
        }
        onCta={() => navigate({ to: "/checkout/revisao" })}
      />
    </div>
  );
}
