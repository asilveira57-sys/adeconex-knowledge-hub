import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Search, X } from "lucide-react";
import {
  getCouponDetail,
  searchCouponTargets,
  upsertCoupon,
  couponInput,
} from "@/lib/coupons.admin.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Mode = "include" | "exclude";
type Picked = { id: string; label: string; mode?: Mode };

const toDateInput = (s: string | null) => (s ? new Date(s).toISOString().slice(0, 10) : "");
const fromDateInput = (s: string) => (s ? new Date(`${s}T00:00:00`).toISOString() : null);
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

const emptyForm = {
  code: "",
  name: "",
  description: "",
  type: "percent" as "percent" | "fixed",
  value: "",
  min_order_amount: "0",
  max_discount_per_order: "",
  max_total_discount: "",
  max_uses: "",
  max_uses_per_user: "",
  starts_at: "",
  expires_at: "",
  stack_with_promotions: true,
  is_active: true,
  applies_to_all_customers: true,
  applies_to_all_categories: true,
  applies_to_all_products: true,
};

export function CouponEditorDialog({
  couponId,
  onClose,
  onSaved,
}: {
  couponId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(emptyForm);
  const [customers, setCustomers] = useState<Picked[]>([]);
  const [categories, setCategories] = useState<Picked[]>([]);
  const [products, setProducts] = useState<Picked[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detail = useQuery({
    queryKey: ["admin", "coupon-detail", couponId],
    queryFn: () => getCouponDetail({ data: { id: couponId! } }),
    enabled: !!couponId,
  });

  useEffect(() => {
    const d = detail.data;
    if (!d) return;
    const c = d.coupon as any;
    setForm({
      code: c.code ?? "",
      name: c.name ?? "",
      description: c.description ?? "",
      type: c.type === "fixed" ? "fixed" : "percent",
      value: String(c.value ?? ""),
      min_order_amount: String(c.min_order_amount ?? "0"),
      max_discount_per_order: c.max_discount_per_order != null ? String(c.max_discount_per_order) : "",
      max_total_discount: c.max_total_discount != null ? String(c.max_total_discount) : "",
      max_uses: c.max_uses != null ? String(c.max_uses) : "",
      max_uses_per_user: c.max_uses_per_user != null ? String(c.max_uses_per_user) : "",
      starts_at: toDateInput(c.starts_at ?? null),
      expires_at: toDateInput(c.expires_at ?? null),
      stack_with_promotions: c.stack_with_promotions !== false,
      is_active: !!c.is_active,
      applies_to_all_customers: c.applies_to_all_customers !== false,
      applies_to_all_categories: c.applies_to_all_categories !== false,
      applies_to_all_products: c.applies_to_all_products !== false,
    });
    setCustomers(d.customers.map((x) => ({ id: x.user_id, label: x.label })));
    setCategories(d.categories.map((x) => ({ id: x.category_id, label: x.label, mode: x.mode })));
    setProducts(d.products.map((x) => ({ id: x.product_id, label: x.label, mode: x.mode })));
  }, [detail.data]);

  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const payload = useMemo(
    () => ({
      id: couponId ?? undefined,
      code: form.code.trim().toUpperCase(),
      name: form.name || null,
      description: form.description || null,
      type: form.type,
      value: Number(form.value.replace(",", ".")) || 0,
      min_order_amount: Number(form.min_order_amount.replace(",", ".")) || 0,
      max_discount_per_order: num(form.max_discount_per_order),
      max_total_discount: num(form.max_total_discount),
      max_uses: num(form.max_uses),
      max_uses_per_user: num(form.max_uses_per_user),
      starts_at: fromDateInput(form.starts_at),
      expires_at: fromDateInput(form.expires_at),
      stack_with_promotions: form.stack_with_promotions,
      is_active: form.is_active,
      applies_to_all_customers: form.applies_to_all_customers,
      applies_to_all_categories: form.applies_to_all_categories,
      applies_to_all_products: form.applies_to_all_products,
      customer_ids: form.applies_to_all_customers ? [] : customers.map((c) => c.id),
      categories: form.applies_to_all_categories
        ? []
        : categories.map((c) => ({ category_id: c.id, mode: c.mode ?? "include" })),
      products: form.applies_to_all_products
        ? []
        : products.map((p) => ({ product_id: p.id, mode: p.mode ?? "include" })),
    }),
    [couponId, form, customers, categories, products],
  );

  const save = useMutation({
    mutationFn: () => upsertCoupon({ data: payload as never }),
    onSuccess: () => {
      toast.success("Cupom salvo.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    const parsed = couponInput.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? "form")] = issue.message;
      setErrors(next);
      toast.error(parsed.error.issues[0]?.message ?? "Revise os campos do cupom.");
      return;
    }
    setErrors({});
    save.mutate();
  };

  const err = (k: string) =>
    errors[k] ? <p className="text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{couponId ? `Editar cupom ${form.code}` : "Novo cupom"}</DialogTitle>
        </DialogHeader>

        {couponId && detail.isLoading ? (
          <div className="py-16 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <Section title="Identificação">
              <div className="space-y-1.5">
                <Label>Código</Label>
                <Input
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  placeholder="BEMVINDO10"
                />
                {err("code")}
              </div>
              <div className="space-y-1.5">
                <Label>Nome interno</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Campanha de boas-vindas" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
            </Section>

            <Section title="Desconto">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Porcentagem (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{form.type === "percent" ? "Percentual (%)" : "Valor (R$)"}</Label>
                <Input value={form.value} onChange={(e) => set("value", e.target.value)} inputMode="decimal" />
                {err("value")}
              </div>
              <div className="space-y-1.5">
                <Label>Pedido mínimo (R$)</Label>
                <Input value={form.min_order_amount} onChange={(e) => set("min_order_amount", e.target.value)} inputMode="decimal" />
                {err("min_order_amount")}
              </div>
              <div className="space-y-1.5">
                <Label>Desconto máx. por pedido (R$)</Label>
                <Input value={form.max_discount_per_order} onChange={(e) => set("max_discount_per_order", e.target.value)} placeholder="sem limite" inputMode="decimal" />
                {err("max_discount_per_order")}
              </div>
              <div className="space-y-1.5">
                <Label>Teto total de desconto (R$)</Label>
                <Input value={form.max_total_discount} onChange={(e) => set("max_total_discount", e.target.value)} placeholder="sem limite" inputMode="decimal" />
                {err("max_total_discount")}
              </div>
              <div className="space-y-1.5">
                <Label>Limite de usos</Label>
                <Input value={form.max_uses} onChange={(e) => set("max_uses", e.target.value)} placeholder="ilimitado" inputMode="numeric" />
                {err("max_uses")}
              </div>
              <div className="space-y-1.5">
                <Label>Usos por cliente</Label>
                <Input value={form.max_uses_per_user} onChange={(e) => set("max_uses_per_user", e.target.value)} placeholder="ilimitado" inputMode="numeric" />
                {err("max_uses_per_user")}
              </div>
            </Section>

            <Section title="Vigência">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input type="date" value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Expiração</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => set("expires_at", e.target.value)} />
                {err("expires_at")}
              </div>
            </Section>

            <div className="space-y-3">
              <p className="text-sm font-semibold">Vínculos</p>

              <ScopeBlock
                title="Clientes"
                allLabel="Válido para todos os clientes"
                all={form.applies_to_all_customers}
                onAllChange={(v) => set("applies_to_all_customers", v)}
                kind="customer"
                items={customers}
                setItems={setCustomers}
                withModes={false}
                error={errors.customer_ids}
              />

              <ScopeBlock
                title="Categorias"
                allLabel="Válido para todas as categorias"
                all={form.applies_to_all_categories}
                onAllChange={(v) => set("applies_to_all_categories", v)}
                kind="category"
                items={categories}
                setItems={setCategories}
                withModes
                error={errors.categories}
              />

              <ScopeBlock
                title="Produtos"
                allLabel="Válido para todos os produtos"
                all={form.applies_to_all_products}
                onAllChange={(v) => set("applies_to_all_products", v)}
                kind="product"
                items={products}
                setItems={setProducts}
                withModes
                error={errors.products}
              />
            </div>

            <div className="space-y-3">
              <ToggleRow
                title="Acumular com promoções"
                hint='Permite aplicar sobre itens já em promoção ou em "Compre Junto".'
                checked={form.stack_with_promotions}
                onChange={(v) => set("stack_with_promotions", v)}
              />
              <ToggleRow
                title="Cupom ativo"
                hint="Cupons inativos não podem ser aplicados no carrinho."
                checked={form.is_active}
                onChange={(v) => set("is_active", v)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
}: {
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ScopeBlock({
  title,
  allLabel,
  all,
  onAllChange,
  kind,
  items,
  setItems,
  withModes,
  error,
}: {
  title: string;
  allLabel: string;
  all: boolean;
  onAllChange: (v: boolean) => void;
  kind: "customer" | "category" | "product";
  items: Picked[];
  setItems: React.Dispatch<React.SetStateAction<Picked[]>>;
  withModes: boolean;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const results = useQuery({
    queryKey: ["admin", "coupon-targets", kind, debounced],
    queryFn: () => searchCouponTargets({ data: { kind, query: debounced } }),
    enabled: !all,
    staleTime: 30_000,
  });

  const add = (r: { id: string; label: string }) => {
    setItems((prev) => (prev.some((p) => p.id === r.id) ? prev : [...prev, { ...r, mode: "include" }]));
  };

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          {allLabel}
          <Switch checked={all} onCheckedChange={onAllChange} />
        </label>
      </div>

      {!all && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={`Buscar ${title.toLowerCase()}...`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {results.isFetching && <p className="text-xs text-muted-foreground">Buscando…</p>}
          {!results.isFetching && (results.data ?? []).length > 0 && (
            <div className="max-h-40 overflow-y-auto rounded-md border">
              {(results.data ?? []).map((r: any) => (
                <button
                  key={r.id}
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                  onClick={() => add(r)}
                >
                  <span>{r.label}</span>
                  {r.hint && <span className="text-xs text-muted-foreground">{r.hint}</span>}
                </button>
              ))}
            </div>
          )}

          {items.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum item vinculado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {items.map((it) => (
                <Badge key={it.id} variant="outline" className="gap-2 py-1">
                  {it.label}
                  {withModes && (
                    <button
                      type="button"
                      className="text-xs underline"
                      onClick={() =>
                        setItems((prev) =>
                          prev.map((p) =>
                            p.id === it.id ? { ...p, mode: p.mode === "exclude" ? "include" : "exclude" } : p,
                          ),
                        )
                      }
                    >
                      {it.mode === "exclude" ? "excluído" : "incluído"}
                    </button>
                  )}
                  <button type="button" onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </>
      )}
    </div>
  );
}
