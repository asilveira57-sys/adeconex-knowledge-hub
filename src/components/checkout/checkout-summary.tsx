
import { ImageOff } from "lucide-react";
import type { CartSnapshot } from "@/lib/cart.functions";
import { SHIPPING_OPTIONS, type ShippingOptionId } from "@/lib/checkout.local";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CheckoutSummary({
  cart,
  shippingOption,
  ctaLabel,
  ctaDisabled,
  ctaReason,
  onCta,
}: {
  cart: CartSnapshot;
  shippingOption: ShippingOptionId | null;
  ctaLabel: string;
  ctaDisabled?: boolean;
  ctaReason?: string | null;
  onCta?: () => void;
}) {
  const shipping = SHIPPING_OPTIONS.find((o) => o.id === shippingOption) ?? null;
  const shippingCost = shipping?.price ?? 0;
  const total = cart.subtotal + shippingCost;

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-5 rounded-xl border hairline bg-card p-6 shadow-card">
        <h2 className="font-display text-lg font-semibold">Resumo do pedido</h2>

        <ul className="space-y-3">
          {cart.items.map((line) => (
            <li key={line.item_id} className="flex gap-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border hairline bg-surface-2">
                {line.image_url ? (
                  <img
                    src={line.image_url}
                    alt=""
                    className="h-full w-full object-contain p-0.5"
                    loading="lazy"
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

        <div className="space-y-2 border-t hairline pt-4 text-sm">
          <Row label="Subtotal" value={money(cart.subtotal)} />
          <Row
            label="Frete"
            value={
              shipping ? (shippingCost === 0 ? "A confirmar" : money(shippingCost)) : "—"
            }
            muted={!shipping}
          />
          <div className="flex items-baseline justify-between border-t hairline pt-3">
            <span className="font-display text-base font-semibold">Total</span>
            <span className="font-display text-xl font-semibold tabular-nums">
              {money(total)}
            </span>
          </div>
        </div>

        <button
          type="button"
          disabled={ctaDisabled}
          onClick={onCta}
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {ctaLabel}
        </button>

        {ctaDisabled && ctaReason && (
          <p className="text-xs text-muted-foreground">{ctaReason}</p>
        )}
      </div>
    </aside>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-medium tabular-nums"}>
        {value}
      </span>
    </div>
  );
}
