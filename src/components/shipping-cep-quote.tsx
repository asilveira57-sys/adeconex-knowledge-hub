import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Truck, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  previewShippingByCep,
  type ShippingPreviewResult,
} from "@/lib/shipping-preview.functions";

function money(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatCep(v: string) {
  const digits = v.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
}

export function ShippingCepQuote({
  productId,
  variantId,
  quantity,
}: {
  productId: string;
  variantId: string | null;
  quantity: number;
}) {
  const [zip, setZip] = useState("");
  const [result, setResult] = useState<ShippingPreviewResult | null>(null);

  const quote = useMutation({
    mutationFn: async () => {
      const digits = zip.replace(/\D/g, "");
      return previewShippingByCep({
        data: {
          product_id: productId,
          variant_id: variantId,
          quantity,
          zip: digits,
        },
      });
    },
    onSuccess: (r) => setResult(r),
  });

  const digits = zip.replace(/\D/g, "");
  const canSubmit = digits.length === 8 && !quote.isPending;

  return (
    <div className="mt-5 border-t hairline pt-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
        <Truck className="h-4 w-4 text-primary" />
        Calcular frete e prazo
      </div>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) quote.mutate();
        }}
      >
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          placeholder="00000-000"
          value={zip}
          onChange={(e) => setZip(formatCep(e.target.value))}
          className="h-10 w-36 rounded-lg border hairline bg-surface-2 px-3 text-sm tabular-nums outline-none focus:border-primary/60"
          aria-label="CEP de entrega"
        />
        <Button type="submit" variant="outline" size="sm" disabled={!canSubmit}>
          {quote.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Calcular
        </Button>
        <a
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Não sei meu CEP
        </a>
      </form>

      {quote.isError && (
        <p className="mt-3 text-xs text-destructive">
          {(quote.error as Error).message}
        </p>
      )}

      {result && (
        <div className="mt-4">
          {result.options.length > 0 ? (
            <ul className="divide-y hairline overflow-hidden rounded-lg border hairline bg-surface-2">
              {result.options.map((opt) => (
                <li
                  key={`${opt.service_id}-${opt.carrier}`}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.carrier_picture && (
                      <img
                        src={opt.carrier_picture}
                        alt=""
                        className="h-5 w-5 shrink-0 object-contain"
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">
                        {opt.carrier} <span className="text-muted-foreground">· {opt.service_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {opt.deadline_days > 0
                          ? `Entrega em até ${opt.deadline_days} ${opt.deadline_days === 1 ? "dia útil" : "dias úteis"}`
                          : "Prazo sob consulta"}
                      </div>
                    </div>
                  </div>
                  <div className="font-display font-semibold tabular-nums">
                    {money(opt.price)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma transportadora retornou preço para este CEP.
              {result.errors.length > 0 && (
                <> {result.errors.slice(0, 2).join(" | ")}</>
              )}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            Valores estimados via Melhor Envio para {result.destination_zip.replace(/(\d{5})(\d{3})/, "$1-$2")}. O frete definitivo é calculado no checkout.
          </p>
        </div>
      )}
    </div>
  );
}
