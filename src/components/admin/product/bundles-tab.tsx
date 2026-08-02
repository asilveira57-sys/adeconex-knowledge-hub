import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Search, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  adminListBundleOffers,
  adminUpsertBundleOffer,
  adminDeleteBundleOffer,
  adminToggleBundleOffer,
  adminSearchProductsForBundle,
} from "@/lib/bundles.functions";
import { money, type BundleOffer } from "@/lib/bundles.shared";
import { Field } from "./fields";

type ItemDraft = {
  product_id: string;
  product_name: string;
  variant_id: string | null;
  variant_scope: "any" | "specific" | "any_kit";
  quantity: number;
  is_anchor: boolean;
  is_complement_target: boolean;
};

type Draft = {
  id?: string;
  name: string;
  discount_type:
    | "percent"
    | "fixed"
    | "fixed_price"
    | "complement_percent"
    | "complement_fixed";
  discount_value: string;
  allow_stack_with_coupon: boolean;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  sort_order: string;
  items: ItemDraft[];
};

const DISCOUNT_LABEL: Record<Draft["discount_type"], string> = {
  percent: "% sobre o conjunto",
  fixed: "R$ fixo de desconto",
  fixed_price: "Preço final fechado (R$)",
  complement_percent: "% somente nos complementos",
  complement_fixed: "R$ somente nos complementos",
};

function emptyDraft(product: { id: string; name: string }): Draft {
  return {
    name: "Compre junto",
    discount_type: "percent",
    discount_value: "10",
    allow_stack_with_coupon: false,
    starts_at: "",
    ends_at: "",
    is_active: true,
    sort_order: "0",
    items: [
      {
        product_id: product.id,
        product_name: product.name,
        variant_id: null,
        variant_scope: "any",
        quantity: 1,
        is_anchor: true,
        is_complement_target: false,
      },
    ],
  };
}

export function BundlesTab({
  productId,
  productName,
}: {
  productId: string;
  productName: string;
}) {
  const listFn = useServerFn(adminListBundleOffers);
  const upsert = useServerFn(adminUpsertBundleOffer);
  const remove = useServerFn(adminDeleteBundleOffer);
  const toggle = useServerFn(adminToggleBundleOffer);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "bundle-offers", productId],
    queryFn: () => listFn({ data: { productId } }),
  });
  const offers = (query.data ?? []) as (BundleOffer & Record<string, any>)[];

  async function refresh() {
    await qc.invalidateQueries({ queryKey: ["admin", "bundle-offers", productId] });
    await qc.invalidateQueries({ queryKey: ["bundle-offers", productId] });
  }

  function editOffer(o: BundleOffer) {
    setDraft({
      id: o.id,
      name: o.name,
      discount_type: o.discount_type,
      discount_value: String(o.discount_value ?? 0),
      allow_stack_with_coupon: !!o.allow_stack_with_coupon,
      starts_at: o.starts_at ? o.starts_at.slice(0, 16) : "",
      ends_at: o.ends_at ? o.ends_at.slice(0, 16) : "",
      is_active: o.is_active,
      sort_order: String(o.sort_order ?? 0),
      items: o.items.map((it) => ({
        product_id: it.product_id,
        product_name: it.product_name ?? it.product_id.slice(0, 8),
        variant_id: it.variant_id ?? null,
        variant_scope: it.variant_scope,
        quantity: it.quantity,
        is_anchor: it.is_anchor,
        is_complement_target: it.is_complement_target,
      })),
    });
  }

  async function save() {
    if (!draft) return;
    if (draft.items.length < 2) {
      toast.error("O conjunto precisa de pelo menos 2 itens.");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        data: {
          id: draft.id,
          product_id: productId,
          name: draft.name.trim(),
          discount_type: draft.discount_type,
          discount_value: Number(draft.discount_value.replace(",", ".")) || 0,
          allow_stack_with_coupon: draft.allow_stack_with_coupon,
          starts_at: draft.starts_at ? new Date(draft.starts_at).toISOString() : null,
          ends_at: draft.ends_at ? new Date(draft.ends_at).toISOString() : null,
          is_active: draft.is_active,
          sort_order: Number(draft.sort_order) || 0,
          items: draft.items.map((it, idx) => ({
            product_id: it.product_id,
            variant_id: it.variant_scope === "specific" ? it.variant_id : null,
            variant_scope: it.variant_scope,
            quantity: it.quantity,
            is_anchor: it.is_anchor,
            is_complement_target: it.is_complement_target,
            sort_order: idx,
          })),
        },
      });
      await refresh();
      setDraft(null);
      toast.success("Oferta salva");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ofertas "Compre Junto" exibidas na página deste produto.
        </p>
        <Button size="sm" onClick={() => setDraft(emptyDraft({ id: productId, name: productName }))}>
          <Plus className="mr-1 h-4 w-4" /> Nova oferta
        </Button>
      </div>

      {query.isLoading && <p className="text-sm text-muted-foreground">Carregando ofertas…</p>}

      {offers.map((o) => (
        <Card key={o.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-3 pb-2">
            <div>
              <CardTitle className="text-sm">{o.name}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {DISCOUNT_LABEL[o.discount_type]} · {o.discount_value} · {o.items.length} itens
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={o.is_active ? "default" : "outline"}>
                {o.is_active ? "Ativa" : "Inativa"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-xs text-muted-foreground">
              {o.items.map((it) => (
                <li key={it.id}>
                  {it.quantity}× {it.product_name ?? it.product_id.slice(0, 8)}
                  {it.variant_label ? ` — ${it.variant_label}` : ""}
                  {it.variant_scope === "any_kit" ? " (qualquer kit)" : ""}
                  {it.is_anchor ? " · âncora" : ""}
                  {it.is_complement_target ? " · alvo do desconto" : ""}
                </li>
              ))}
            </ul>

            <div className="grid grid-cols-2 gap-2 rounded-md border p-2 text-[11px] text-muted-foreground sm:grid-cols-5">
              <Metric label="Impressões" value={o.impressions ?? 0} />
              <Metric label="Add. carrinho" value={o.add_to_cart_count ?? 0} />
              <Metric label="Conversões" value={o.conversions ?? 0} />
              <Metric label="Receita" value={money(Number(o.revenue_total ?? 0))} />
              <Metric label="Desconto" value={money(Number(o.discount_total ?? 0))} />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => editOffer(o)}>
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await toggle({ data: { id: o.id, is_active: !o.is_active } });
                  await refresh();
                }}
              >
                {o.is_active ? "Desativar" : "Ativar"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  editOffer(o);
                  setDraft((d) => (d ? { ...d, id: undefined, name: `${d.name} (cópia)` } : d));
                }}
              >
                <Copy className="mr-1 h-3 w-3" /> Duplicar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={async () => {
                  if (!confirm("Excluir esta oferta?")) return;
                  await remove({ data: { id: o.id } });
                  await refresh();
                  toast.success("Oferta excluída");
                }}
              >
                <Trash2 className="mr-1 h-3 w-3" /> Excluir
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {!query.isLoading && offers.length === 0 && !draft && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma oferta cadastrada para este produto.
        </p>
      )}

      {draft && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {draft.id ? "Editar oferta" : "Nova oferta"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nome" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
              <label className="block">
                <span className="text-xs uppercase text-muted-foreground">Tipo de desconto</span>
                <select
                  value={draft.discount_type}
                  onChange={(e) =>
                    setDraft({ ...draft, discount_type: e.target.value as Draft["discount_type"] })
                  }
                  className="mt-1 w-full rounded-md border bg-surface-1 px-3 py-2 text-sm"
                >
                  {Object.entries(DISCOUNT_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <Field
                label="Valor do desconto"
                type="number"
                value={draft.discount_value}
                onChange={(v) => setDraft({ ...draft, discount_value: v })}
              />
              <Field
                label="Ordem"
                type="number"
                value={draft.sort_order}
                onChange={(v) => setDraft({ ...draft, sort_order: v })}
              />
              <Field
                label="Início"
                type="datetime-local"
                value={draft.starts_at}
                onChange={(v) => setDraft({ ...draft, starts_at: v })}
              />
              <Field
                label="Fim"
                type="datetime-local"
                value={draft.ends_at}
                onChange={(v) => setDraft({ ...draft, ends_at: v })}
              />
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.is_active}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                />
                Oferta ativa
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.allow_stack_with_coupon}
                  onChange={(e) =>
                    setDraft({ ...draft, allow_stack_with_coupon: e.target.checked })
                  }
                />
                Acumula com cupom
              </label>
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase text-muted-foreground">Itens do conjunto</p>
              {draft.items.map((it, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                  <span className="min-w-[180px] flex-1 truncate">{it.product_name}</span>
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => {
                      const items = [...draft.items];
                      items[idx] = { ...it, quantity: Math.max(1, Number(e.target.value) || 1) };
                      setDraft({ ...draft, items });
                    }}
                    className="w-16 rounded-md border bg-surface-1 px-2 py-1 text-sm"
                    aria-label="Quantidade"
                  />
                  <select
                    value={it.variant_scope}
                    onChange={(e) => {
                      const items = [...draft.items];
                      items[idx] = { ...it, variant_scope: e.target.value as ItemDraft["variant_scope"] };
                      setDraft({ ...draft, items });
                    }}
                    className="rounded-md border bg-surface-1 px-2 py-1 text-xs"
                    aria-label="Escopo da variação"
                  >
                    <option value="any">Qualquer variação</option>
                    <option value="specific">Variação específica</option>
                    <option value="any_kit">Qualquer kit</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={it.is_anchor}
                      onChange={(e) => {
                        const items = [...draft.items];
                        items[idx] = { ...it, is_anchor: e.target.checked };
                        setDraft({ ...draft, items });
                      }}
                    />
                    âncora
                  </label>
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={it.is_complement_target}
                      onChange={(e) => {
                        const items = [...draft.items];
                        items[idx] = { ...it, is_complement_target: e.target.checked };
                        setDraft({ ...draft, items });
                      }}
                    />
                    alvo do desconto
                  </label>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() =>
                      setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) })
                    }
                    aria-label="Remover item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <ProductPicker
                onPick={(prod) =>
                  setDraft({
                    ...draft,
                    items: [
                      ...draft.items,
                      {
                        product_id: prod.id,
                        product_name: prod.name,
                        variant_id: null,
                        variant_scope: "any",
                        quantity: 1,
                        is_anchor: false,
                        is_complement_target: true,
                      },
                    ],
                  })
                }
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Salvar oferta
              </Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function ProductPicker({ onPick }: { onPick: (p: { id: string; name: string }) => void }) {
  const searchFn = useServerFn(adminSearchProductsForBundle);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string; sku: string | null }>>([]);
  const [loading, setLoading] = useState(false);

  async function run() {
    if (term.trim().length < 2) return;
    setLoading(true);
    try {
      const res = await searchFn({ data: { query: term.trim() } });
      setResults((res.products ?? []) as any);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-md border p-2">
      <div className="flex gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run();
            }
          }}
          placeholder="Buscar produto por nome ou SKU"
          className="flex-1 rounded-md border bg-surface-1 px-3 py-2 text-sm"
        />
        <Button size="sm" variant="outline" onClick={() => void run()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>
      {results.length > 0 && (
        <ul className="mt-2 max-h-52 space-y-1 overflow-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-muted"
                onClick={() => {
                  onPick({ id: r.id, name: r.name });
                  setResults([]);
                  setTerm("");
                }}
              >
                {r.name} {r.sku ? <span className="text-xs text-muted-foreground">· {r.sku}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
