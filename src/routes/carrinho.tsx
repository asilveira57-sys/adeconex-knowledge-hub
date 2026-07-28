import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, ShoppingBag, Trash2, ImageOff, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { applyCouponToCart, removeCouponFromCart } from "@/lib/coupons.functions";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Meu carrinho — Adeconex" },
      { name: "description", content: "Revise seus itens antes de finalizar a compra." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function CartPage() {
  const { user } = useSession();
  const { snapshot, updateQty, remove, loading } = useCart();

  const isEmpty = snapshot.items.length === 0;

  return (
    <div className="container-page py-10">
      <header className="mb-8 flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl font-semibold tracking-tight">Meu carrinho</h1>
        {snapshot.item_count > 0 && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-mono uppercase tracking-[0.14em] text-primary">
            {snapshot.item_count} {snapshot.item_count === 1 ? "item" : "itens"}
          </span>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ul className="space-y-4">
            {snapshot.items.map((line) => (
              <li
                key={line.item_id}
                className="flex gap-4 rounded-xl border hairline bg-card p-4 shadow-card"
              >
                <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border hairline bg-surface-2">
                  {line.image_url ? (
                    <img
                      src={line.image_url}
                      alt=""
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <ImageOff className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {line.product_slug ? (
                        <Link
                          to="/produto/$slug"
                          params={{ slug: line.product_slug }}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {line.product_name || "Produto"}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">Produto do carrinho</span>
                      )}
                      {line.variant_label && (
                        <p className="text-xs text-muted-foreground">{line.variant_label}</p>
                      )}
                      {line.units_per_pack > 1 && (
                        <p className="text-xs text-primary">
                          {line.quantity} {line.quantity === 1 ? "caixa" : "caixas"} ·{" "}
                          {line.units_per_pack} un/cx ={" "}
                          <strong>{line.quantity * line.units_per_pack} unidades</strong>
                        </p>
                      )}
                      {line.sku && (
                        <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
                          SKU {line.sku}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove.mutate(line)}
                      aria-label="Remover item"
                      className="rounded-md p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    <QtyStepper
                      quantity={line.quantity}
                      onChange={(q) => updateQty.mutate({ item: line, quantity: q })}
                      max={line.max_stock ?? undefined}
                      unitLabel={line.units_per_pack > 1 ? "caixas" : undefined}
                    />
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">
                        {money(line.unit_price)} {line.units_per_pack > 1 ? "/ caixa" : "un."}
                      </div>
                      <div className="font-display text-lg font-semibold tabular-nums">
                        {money(line.line_total)}
                      </div>
                    </div>
                  </div>

                </div>
              </li>
            ))}
          </ul>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-4 rounded-xl border hairline bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-semibold">Resumo</h2>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums font-medium">{money(snapshot.subtotal_full)}</span>
              </div>
              {snapshot.bundle_discount_total > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Compre Junto</span>
                  <span className="tabular-nums font-medium">- {money(snapshot.bundle_discount_total)}</span>
                </div>
              )}
              {snapshot.coupon && snapshot.coupon_discount_total > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span>Cupom {snapshot.coupon.code}</span>
                  <span className="tabular-nums font-medium">- {money(snapshot.coupon_discount_total)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Frete</span>
                <span className="text-muted-foreground">Calculado no checkout</span>
              </div>
              <div className="flex items-baseline justify-between border-t hairline pt-3">
                <span className="font-display text-base font-semibold">Total parcial</span>
                <span className="font-display text-lg font-semibold tabular-nums">{money(snapshot.subtotal)}</span>
              </div>
              {user && <CouponBox snapshot={snapshot} />}
              <div className="border-t hairline pt-4">
                {user ? (
                  <Button asChild className="w-full" size="lg">
                    <Link to="/checkout/endereco">Finalizar compra</Link>
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                        Para finalizar a compra, entre na sua conta.
                    </p>
                    <Button asChild className="w-full" size="lg">
                      <Link
                        to="/auth"
                        search={{ redirect: "/carrinho" } as never}
                      >
                        Entrar para continuar
                      </Link>
                    </Button>
                  </div>
                )}
                <Button asChild variant="outline" className="mt-2 w-full">
                  <Link to="/catalogo">Continuar comprando</Link>
                </Button>
              </div>
              {user && (
                <p className="text-xs text-muted-foreground">
                  Seus itens ficam salvos entre dispositivos enquanto você estiver conectado.
                </p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function QtyStepper({
  quantity,
  onChange,
  max,
  unitLabel,
}: {
  quantity: number;
  onChange: (q: number) => void;
  max?: number;
  unitLabel?: string;
}) {
  const canInc = max == null || quantity < max;
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-lg border hairline bg-surface-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, quantity - 1))}
          aria-label="Diminuir"
          className="p-2 text-foreground hover:bg-accent disabled:opacity-40"
          disabled={quantity <= 1}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-10 text-center text-sm font-medium tabular-nums">{quantity}</span>
        <button
          type="button"
          onClick={() => onChange(quantity + 1)}
          aria-label="Aumentar"
          className="p-2 text-foreground hover:bg-accent disabled:opacity-40"
          disabled={!canInc}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      {unitLabel && <span className="text-xs text-muted-foreground">{unitLabel}</span>}
    </div>
  );
}


function EmptyState() {
  return (
    <div className="rounded-xl border hairline bg-card p-12 text-center shadow-card">
      <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <h2 className="font-display text-xl font-semibold">Seu carrinho está vazio</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Explore o catálogo e adicione produtos de impressão térmica, etiquetas e ribbons.
      </p>
      <Button asChild className="mt-6">
        <Link to="/catalogo">Ir ao catálogo</Link>
      </Button>
    </div>
  );
}
