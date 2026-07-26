import { emptyCartSnapshot } from "@/lib/cart.functions";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCheckoutSnapshot } from "@/lib/checkout.functions";
import { useCheckoutSelection, useAutoSelectAddress } from "@/hooks/use-checkout";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/checkout/endereco")({
  component: EnderecoStep,
});

function formatAddress(a: {
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  zip: string;
}) {
  const line1 = `${a.street}, ${a.number}${a.complement ? " · " + a.complement : ""}`;
  const zip = a.zip.replace(/^(\d{5})(\d{3})$/, "$1-$2");
  return `${line1} — ${a.district}, ${a.city}/${a.state} · CEP ${zip}`;
}

function EnderecoStep() {
  const fetchSnap = useServerFn(getCheckoutSnapshot);
  const { data, isLoading } = useQuery({
    queryKey: ["checkout", "snapshot"],
    queryFn: () => fetchSnap(),
    staleTime: 10_000,
  });
  const { selection, update } = useCheckoutSelection();
  const navigate = useNavigate();

  useAutoSelectAddress(data?.addresses ?? [], selection.address_id, update);

  const canContinue = !!selection.address_id;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <section className="rounded-xl border hairline bg-card p-6 shadow-card">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Endereço de entrega</h2>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/minha-conta" search={{ tab: "addresses" } as never}>
                <Plus className="mr-1 h-4 w-4" /> Novo endereço
              </Link>
            </Button>
          </header>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : (data?.addresses.length ?? 0) === 0 ? (
            <div className="rounded-lg border hairline border-dashed bg-surface-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Você ainda não tem endereços cadastrados.
              </p>
              <Button asChild className="mt-4">
                <Link to="/minha-conta" search={{ tab: "addresses" } as never}>
                  Cadastrar endereço
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {data!.addresses
                .filter((a) => a.kind === "shipping" || a.kind === "both")
                .map((a) => {
                  const active = selection.address_id === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => update({ address_id: a.id })}
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
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{a.recipient_name}</span>
                            {a.label && (
                              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                                {a.label}
                              </span>
                            )}
                            {a.is_default_shipping && (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-primary">
                                Padrão
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatAddress(a)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        {data && data.companies.length > 0 && (
          <section className="rounded-xl border hairline bg-card p-6 shadow-card">
            <header className="mb-3">
              <h2 className="font-display text-lg font-semibold">Faturamento (opcional)</h2>
              <p className="text-sm text-muted-foreground">
                Emitir nota fiscal para uma empresa cadastrada.
              </p>
            </header>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => update({ billing_company_id: null })}
                className={cn(
                  "rounded-lg border hairline bg-card p-3 text-left text-sm",
                  !selection.billing_company_id && "border-primary/60 ring-1 ring-primary/40",
                )}
              >
                <div className="font-medium">Pessoa física</div>
                <div className="text-xs text-muted-foreground">Sem CNPJ na nota</div>
              </button>
              {data.companies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => update({ billing_company_id: c.id })}
                  className={cn(
                    "rounded-lg border hairline bg-card p-3 text-left text-sm",
                    selection.billing_company_id === c.id &&
                      "border-primary/60 ring-1 ring-primary/40",
                  )}
                >
                  <div className="font-medium">{c.trade_name || c.legal_name}</div>
                  <div className="text-xs text-muted-foreground">
                    CNPJ {c.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <CheckoutSummary
        cart={data?.cart ?? emptyCartSnapshot()}
        selection={selection}
        ctaLabel="Continuar para frete"
        ctaDisabled={!canContinue}
        ctaReason={canContinue ? null : "Selecione um endereço para continuar."}
        onCta={() => navigate({ to: "/checkout/frete" })}
      />
    </div>
  );
}
