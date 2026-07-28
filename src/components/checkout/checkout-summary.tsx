import { ImageOff } from "lucide-react";
import type { CartSnapshot } from "@/lib/cart.functions";
import type { CheckoutSelection } from "@/lib/checkout.local";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function resolveShippingDisplay(sel: Pick<CheckoutSelection, "shipping_option" | "shipping_snapshot">) {
  if (sel.shipping_option === "carrier" && sel.shipping_snapshot) {
    return { price: sel.shipping_snapshot.price, label: money(sel.shipping_snapshot.price) };
  }
  if (sel.shipping_option === "pickup") return { price: 0, label: "Retirada — grátis" };
  if (sel.shipping_option === "quote_later") return { price: 0, label: "A confirmar" };
  return { price: 0, label: "—" };
}

export function CheckoutSummary({
  cart,
  selection,
  ctaLabel,
  ctaDisabled,
  ctaReason,
  onCta,
}: {
  cart: CartSnapshot;
  selection: Pick<CheckoutSelection, "shipping_option" | "shipping_snapshot">;
  ctaLabel: string;
  ctaDisabled?: boolean;
  ctaReason?: string | null;
  onCta?: () => void;
}) {
  const ship = resolveShippingDisplay(selection);
  const total = cart.subtotal + ship.price;
  const hasShipping = !!selection.shipping_option;
  const bundleDiscount = cart.bundle_discount_total ?? 0;
  const couponDiscount = cart.coupon_discount_total ?? 0;

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
          <Row label="Subtotal" value={money(cart.subtotal_full ?? cart.subtotal)} />
          {bundleDiscount > 0 && (
            <Row label="Desconto Compre Junto" value={`- ${money(bundleDiscount)}`} />
          )}
          {couponDiscount > 0 && cart.coupon && (
            <Row label={`Cupom ${cart.coupon.code}`} value={`- ${money(couponDiscount)}`} />
          )}
          <Row label="Frete" value={ship.label} muted={!hasShipping} />
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
