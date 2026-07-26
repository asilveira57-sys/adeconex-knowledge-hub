import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Truck, Check, Clock, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCheckoutSnapshot } from "@/lib/checkout.functions";
import { quoteShipping, type ShippingOption } from "@/lib/shipping.functions";
import { useCheckoutSelection } from "@/hooks/use-checkout";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { FALLBACK_SHIPPING } from "@/lib/checkout.local";

export const Route = createFileRoute("/_authenticated/checkout/frete")({
  component: FreteStep,
});

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function FreteStep() {
  const fetchSnap = useServerFn(getCheckoutSnapshot);
  const runQuote = useServerFn(quoteShipping);
  const { data: snap } = useQuery({
    queryKey: ["checkout", "snapshot"],
    queryFn: () => fetchSnap(),
    staleTime: 10_000,
  });
  const { selection, update } = useCheckoutSelection();
  const navigate = useNavigate();

  const quotesQuery = useQuery({
    queryKey: ["shipping", "quote", selection.address_id],
    queryFn: () => runQuote({ data: { address_id: selection.address_id! } }),
    enabled: !!selection.address_id,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const quotes = (quotesQuery.data ?? []) as ShippingOption[];
  const selectedQuoteId =
    selection.shipping_option === "carrier"
      ? selection.shipping_snapshot?.quote_id ?? null
      : null;
  const canContinue = !!selection.shipping_option && !!selection.address_id;

  function pickQuote(q: ShippingOption) {
    update({
      shipping_option: "carrier",
      shipping_snapshot: {
        quote_id: q.quote_id,
        carrier: q.carrier,
        service_name: q.service_name,
        price: q.price,
        deadline_days: q.deadline_days,
      },
    });
  }

  function pickFallback(id: "pickup" | "quote_later") {
    update({ shipping_option: id, shipping_snapshot: null });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-xl border hairline bg-card p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Transportadoras</h2>
            </div>
            <button
              type="button"
              onClick={() => quotesQuery.refetch()}
              disabled={quotesQuery.isFetching}
              className="inline-flex items-center gap-1 rounded-md border hairline bg-surface-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={cn("h-3 w-3", quotesQuery.isFetching && "animate-spin")} />
              Recotar
            </button>
          </header>

          {!selection.address_id ? (
            <p className="text-sm text-muted-foreground">
              Volte e selecione um endereço para cotarmos o frete.
            </p>
          ) : quotesQuery.isPending ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Consultando Melhor Envio…
            </p>
          ) : quotesQuery.isError ? (
            <div className="flex items-start gap-2 rounded-md border hairline bg-amber-500/5 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <p className="font-medium">Não foi possível cotar agora.</p>
                <p className="text-xs text-muted-foreground">
                  {(quotesQuery.error as Error)?.message ?? "Erro desconhecido"}.
                  Escolha uma das opções manuais abaixo ou tente recotar.
                </p>
              </div>
            </div>
          ) : quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma transportadora disponível para este CEP. Utilize uma das opções abaixo.
            </p>
          ) : (
            <ul className="space-y-3">
              {quotes.map((q) => {
                const active = selectedQuoteId === q.quote_id;
                return (
                  <li key={q.quote_id}>
                    <button
                      type="button"
                      onClick={() => pickQuote(q)}
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
                      {q.carrier_picture ? (
                        <img
                          src={q.carrier_picture}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded object-contain"
                          loading="lazy"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium">
                            {q.carrier}{" "}
                            <span className="text-muted-foreground">· {q.service_name}</span>
                          </span>
                          <span className="text-sm font-semibold tabular-nums">
                            {money(q.price)}
                          </span>
                        </div>
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Entrega em até {q.deadline_days}{" "}
                          {q.deadline_days === 1 ? "dia útil" : "dias úteis"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border hairline bg-card p-6 shadow-card">
          <header className="mb-3">
            <h2 className="font-display text-lg font-semibold">Outras opções</h2>
            <p className="text-sm text-muted-foreground">
              Retirada no CD ou frete negociado com o comercial.
            </p>
          </header>
          <ul className="space-y-3">
            {FALLBACK_SHIPPING.map((opt) => {
              const active = selection.shipping_option === opt.id;
              return (
                <li key={opt.id}>
                  <button
                    type="button"
                    onClick={() => pickFallback(opt.id)}
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
                          {opt.id === "pickup" ? "Grátis" : "A confirmar"}
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
        cart={snap?.cart ?? emptyCartSnapshot()}
        selection={selection}
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
