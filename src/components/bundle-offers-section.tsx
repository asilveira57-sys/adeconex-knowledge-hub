import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ImageOff, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listBundleOffersForProduct,
  addBundleToCart,
} from "@/lib/bundles.functions";
import { money, type BundleOffer, type BundleOfferItem } from "@/lib/bundles.shared";
import { useSession } from "@/hooks/use-session";

type Props = { productId: string };

export function BundleOffersSection({ productId }: Props) {
  const listFn = useServerFn(listBundleOffersForProduct);
  const query = useQuery({
    queryKey: ["bundle-offers", productId],
    queryFn: () => listFn({ data: { productId } }),
    staleTime: 60_000,
  });

  const offers = query.data ?? [];
  if (query.isLoading || offers.length === 0) return null;

  return (
    <section aria-labelledby="compre-junto" className="mx-auto mt-16 max-w-5xl">
      <p className="eyebrow text-primary flex items-center gap-2">
        <Sparkles className="h-4 w-4" /> Compre junto
      </p>
      <h2
        id="compre-junto"
        className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl"
      >
        Leve o conjunto e economize
      </h2>
      <div className="mt-6 grid gap-6">
        {offers.map((o) => (
          <BundleOfferCard key={o.id} offer={o} />
        ))}
      </div>
    </section>
  );
}

function BundleOfferCard({ offer }: { offer: BundleOffer }) {
  const { user } = useSession();
  const qc = useQueryClient();
  const addFn = useServerFn(addBundleToCart);
  const [selections, setSelections] = useState<Record<string, string | null>>(
    () => {
      const init: Record<string, string | null> = {};
      for (const it of offer.items) init[it.id] = it.variant_id ?? null;
      return init;
    },
  );
  const [submitting, setSubmitting] = useState(false);

  const totals = useMemo(() => {
    const normal = offer.items.reduce(
      (s, i) => s + (i.unit_price ?? 0) * i.quantity,
      0,
    );
    const normalComplement = offer.items
      .filter((i) => i.is_complement_target)
      .reduce((s, i) => s + (i.unit_price ?? 0) * i.quantity, 0);
    let discount = 0;
    switch (offer.discount_type) {
      case "percent":
        discount = (normal * offer.discount_value) / 100;
        break;
      case "fixed":
        discount = Math.min(offer.discount_value, normal);
        break;
      case "fixed_price":
        discount = Math.max(0, normal - offer.discount_value);
        break;
      case "complement_percent":
        discount = (normalComplement * offer.discount_value) / 100;
        break;
      case "complement_fixed":
        discount = Math.min(offer.discount_value, normalComplement);
        break;
    }
    discount = Math.max(0, Number(discount.toFixed(2)));
    const final = Math.max(0, Number((normal - discount).toFixed(2)));
    const percent = normal > 0 ? Math.round((discount / normal) * 100) : 0;
    return { normal, discount, final, percent };
  }, [offer]);

  const needsSelection = offer.items.some(
    (i) => i.variant_scope !== "specific" && !selections[i.id],
  );

  async function onAdd() {
    if (!user) {
      toast.error("Entre para adicionar o conjunto ao carrinho.");
      return;
    }
    try {
      setSubmitting(true);
      await addFn({
        data: {
          offer_id: offer.id,
          selections: offer.items.map((i) => ({
            offer_item_id: i.id,
            product_id: i.product_id,
            variant_id:
              i.variant_scope === "specific"
                ? i.variant_id
                : selections[i.id] ?? null,
          })),
        },
      });
      toast.success("Conjunto adicionado ao carrinho");
      qc.invalidateQueries({ queryKey: ["cart"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível adicionar o conjunto");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className="rounded-2xl border hairline bg-card p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight">
            {offer.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Leve {offer.items.length} itens deste conjunto e ganhe desconto.
          </p>
        </div>
        {totals.percent > 0 && (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
            -{totals.percent}%
          </Badge>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {offer.items.map((it, idx) => (
          <BundleItemRow
            key={it.id}
            item={it}
            index={idx}
            selectedVariantId={selections[it.id] ?? null}
            onSelect={(vid) =>
              setSelections((s) => ({ ...s, [it.id]: vid }))
            }
          />
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-4 border-t hairline pt-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1 text-sm">
          <div className="flex items-baseline gap-2 text-muted-foreground">
            <span>Preço normal do conjunto:</span>
            <span className="line-through">{money(totals.normal)}</span>
          </div>
          <div className="flex items-baseline gap-2 text-muted-foreground">
            <span>Desconto:</span>
            <span className="font-medium text-primary">
              − {money(totals.discount)}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground">Preço final:</span>
            <span className="font-display text-2xl font-semibold text-foreground">
              {money(totals.final)}
            </span>
          </div>
          <p className="text-xs font-medium text-primary">
            Você economiza {money(totals.discount)}
          </p>
        </div>
        <Button
          size="lg"
          onClick={onAdd}
          disabled={submitting || needsSelection || totals.discount <= 0}
          className="md:min-w-[260px]"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          {submitting ? "Adicionando…" : "Adicionar conjunto ao carrinho"}
        </Button>
      </div>
      {needsSelection && (
        <p className="mt-2 text-right text-xs text-muted-foreground">
          Selecione as variações obrigatórias acima.
        </p>
      )}
    </article>
  );
}

function BundleItemRow({
  item,
  index,
  selectedVariantId,
  onSelect,
}: {
  item: BundleOfferItem;
  index: number;
  selectedVariantId: string | null;
  onSelect: (variantId: string | null) => void;
}) {
  const price = item.unit_price ?? 0;
  return (
    <div className="flex items-start gap-3 rounded-xl border hairline bg-surface-2/40 p-3">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border hairline bg-surface-2">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.product_name ?? ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
        <span className="absolute left-1 top-1 rounded bg-background/90 px-1.5 text-[10px] font-semibold text-foreground">
          {index + 1}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.product_name}</p>
        {item.variant_label && (
          <p className="truncate text-xs text-muted-foreground">
            {item.variant_label}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            Qtd: <strong className="text-foreground">{item.quantity}</strong>
          </span>
          {price > 0 && (
            <span>
              · {money(price)} <span className="text-muted-foreground/70">un.</span>
            </span>
          )}
          {item.is_anchor && (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              Principal
            </Badge>
          )}
          {item.is_complement_target && (
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              Desconto aplicado aqui
            </Badge>
          )}
        </div>
        {item.variant_scope !== "specific" && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            {selectedVariantId
              ? "Variação selecionada."
              : "Escolha a variação na página do produto antes de adicionar."}
          </p>
        )}
      </div>
    </div>
  );
}
