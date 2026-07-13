import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MapPin, Truck, User, ImageOff, Pencil } from "lucide-react";
import { getCheckoutSnapshot } from "@/lib/checkout.functions";
import { useCheckoutSelection } from "@/hooks/use-checkout";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";
import { SHIPPING_OPTIONS } from "@/lib/checkout.local";

export const Route = createFileRoute("/_authenticated/checkout/revisao")({
  component: RevisaoStep,
});

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function RevisaoStep() {
  const fetchSnap = useServerFn(getCheckoutSnapshot);
  const { data, isLoading } = useQuery({
    queryKey: ["checkout", "snapshot"],
    queryFn: () => fetchSnap(),
    staleTime: 5_000,
  });
  const { selection } = useCheckoutSelection();
  const navigate = useNavigate();

  const address = data?.addresses.find((a) => a.id === selection.address_id) ?? null;
  const company =
    data?.companies.find((c) => c.id === selection.billing_company_id) ?? null;
  const shipping = SHIPPING_OPTIONS.find((o) => o.id === selection.shipping_option) ?? null;

  const canContinue = !!address && !!shipping && (data?.cart.items.length ?? 0) > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <ReviewBlock
          icon={<MapPin className="h-4 w-4" />}
          title="Endereço de entrega"
          editHref="/checkout/endereco"
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : address ? (
            <>
              <p className="font-medium">{address.recipient_name}</p>
              <p className="text-sm text-muted-foreground">
                {address.street}, {address.number}
                {address.complement ? ` · ${address.complement}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {address.district}, {address.city}/{address.state} · CEP{" "}
                {address.zip.replace(/^(\d{5})(\d{3})$/, "$1-$2")}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum endereço selecionado.</p>
          )}
        </ReviewBlock>

        <ReviewBlock
          icon={<User className="h-4 w-4" />}
          title="Faturamento"
          editHref="/checkout/endereco"
        >
          {company ? (
            <>
              <p className="font-medium">{company.trade_name || company.legal_name}</p>
              <p className="text-sm text-muted-foreground">
                CNPJ{" "}
                {company.cnpj.replace(
                  /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
                  "$1.$2.$3/$4-$5",
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nota emitida como pessoa física.</p>
          )}
        </ReviewBlock>

        <ReviewBlock
          icon={<Truck className="h-4 w-4" />}
          title="Entrega"
          editHref="/checkout/frete"
        >
          {shipping ? (
            <>
              <p className="font-medium">{shipping.label}</p>
              <p className="text-sm text-muted-foreground">{shipping.deadline}</p>
              <p className="text-sm text-muted-foreground">
                {shipping.price === 0 ? "Valor a confirmar" : money(shipping.price)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma modalidade selecionada.</p>
          )}
          {selection.customer_notes && (
            <p className="mt-3 rounded-md bg-surface-2 p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Observações: </strong>
              {selection.customer_notes}
            </p>
          )}
        </ReviewBlock>

        <ReviewBlock icon={null} title="Itens" editHref="/carrinho">
          <ul className="space-y-3">
            {(data?.cart.items ?? []).map((line) => (
              <li key={line.item_id} className="flex gap-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border hairline bg-surface-2">
                  {line.image_url ? (
                    <img
                      src={line.image_url}
                      alt=""
                      className="h-full w-full object-contain p-0.5"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium">{line.product_name}</p>
                  {line.variant_label && (
                    <p className="text-xs text-muted-foreground">{line.variant_label}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {line.quantity} × {money(line.unit_price)}
                  </p>
                </div>
                <div className="text-right text-sm font-medium tabular-nums">
                  {money(line.line_total)}
                </div>
              </li>
            ))}
          </ul>
        </ReviewBlock>
      </div>

      <CheckoutSummary
        cart={data?.cart ?? { cart_id: null, currency: "BRL", items: [], subtotal: 0, item_count: 0 }}
        shippingOption={selection.shipping_option}
        ctaLabel="Ir para pagamento"
        ctaDisabled={!canContinue}
        ctaReason={
          canContinue ? null : "Complete endereço e frete antes de continuar."
        }
        onCta={() => navigate({ to: "/checkout/pagamento" })}
      />
    </div>
  );
}

function ReviewBlock({
  icon,
  title,
  editHref,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  editHref: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border hairline bg-card p-5 shadow-card">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
        </div>
        <Link
          to={editHref}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <Pencil className="h-3 w-3" /> Alterar
        </Link>
      </header>
      {children}
    </section>
  );
}
