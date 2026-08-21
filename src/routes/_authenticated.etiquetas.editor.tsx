import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LabelEditor } from "@/components/labels/label-editor";
import {
  addDesignToCart,
  deleteDesign,
  getCustomizableProduct,
  getLabelPricing,
  listCustomizableProducts,
  listMyDesigns,
  saveDesign,
  type SavedDesign,
} from "@/lib/labels.functions";
import {
  designFromSpec,
  emptyDesign,
  SHAPE_LABELS,
  type LabelDesign,
  type LabelLayer,
  type LabelShape,
} from "@/lib/labels/shared";

export const Route = createFileRoute("/_authenticated/etiquetas/editor")({
  validateSearch: (search: Record<string, unknown>) => ({
    design: typeof search.design === "string" ? search.design : undefined,
    produto: typeof search.produto === "string" ? search.produto : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Editor de etiqueta personalizada — Adeconex" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EditorPage,
});

const DRAFT_KEY = "adeconex:label-draft";

type Draft = { design: LabelDesign; specKey: string | null; quantity: number; savedAt: string };

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    return parsed?.design ? parsed : null;
  } catch {
    return null;
  }
}

function designFromSaved(d: SavedDesign): LabelDesign {
  return {
    id: d.id,
    name: d.name,
    base_product_id: d.base_product_id,
    width_mm: Number(d.width_mm),
    height_mm: Number(d.height_mm),
    shape: (d.shape ?? "rect") as LabelShape,
    corner_radius_mm: d.corner_radius_mm == null ? null : Number(d.corner_radius_mm),
    material: d.material,
    ribbon_color: d.ribbon_color,
    background_color: d.background_color,
    layout: (d.layout ?? []) as LabelLayer[],
  };
}

function EditorPage() {
  const { design: designId, produto } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const pricingFn = useServerFn(getLabelPricing);
  const productsFn = useServerFn(listCustomizableProducts);
  const productFn = useServerFn(getCustomizableProduct);
  const designsFn = useServerFn(listMyDesigns);
  const saveFn = useServerFn(saveDesign);
  const deleteFn = useServerFn(deleteDesign);
  const addFn = useServerFn(addDesignToCart);

  const tiers = useQuery({ queryKey: ["label-pricing"], queryFn: () => pricingFn(), staleTime: 300_000 });
  const products = useQuery({ queryKey: ["label-products"], queryFn: () => productsFn(), staleTime: 300_000 });
  const designs = useQuery({ queryKey: ["label-designs"], queryFn: () => designsFn() });

  const [design, setDesign] = useState<LabelDesign>(() => emptyDesign());
  const [quantity, setQuantity] = useState(1000);
  const [hydrated, setHydrated] = useState(false);
  // Slug (URL) ou id do produto-base — garante que a ficha (grade/espaçamentos) volte junto
  const [specKey, setSpecKey] = useState<string | null>(produto ?? null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const baseProduct = useQuery({
    queryKey: ["label-product", specKey],
    queryFn: () => productFn({ data: { slug: specKey! } }),
    enabled: !!specKey,
    staleTime: 300_000,
  });

  // Lista de etiquetas-base + a ficha do produto atual (pode não estar na lista)
  const productList = useMemo(() => {
    const list = products.data ?? [];
    const extra = baseProduct.data;
    return extra && !list.some((p) => p.id === extra.id) ? [extra, ...list] : list;
  }, [products.data, baseProduct.data]);

  const loadSaved = useCallback((d: SavedDesign) => {
    setDesign(designFromSaved(d));
    setSpecKey(d.base_product_id ?? null);
  }, []);

  // Carrega modelo salvo, rascunho local ou pré-configura pela ficha do produto da URL
  useEffect(() => {
    if (hydrated) return;
    if (designId) {
      const found = designs.data?.find((d) => d.id === designId);
      if (!found) return;
      loadSaved(found);
      setHydrated(true);
      return;
    }
    if (produto) {
      if (baseProduct.isPending) return;
      const match = baseProduct.data;
      if (match) setDesign((d) => designFromSpec(match, d));
      setHydrated(true);
      return;
    }
    setDraft(readDraft());
    setHydrated(true);
  }, [designId, produto, designs.data, baseProduct.data, baseProduct.isPending, hydrated, loadSaved]);

  // Rascunho automático no navegador (não perde a arte ao fechar a aba)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const payload: Draft = { design, specKey, quantity, savedAt: new Date().toISOString() };
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      } catch {
        /* quota — ignora */
      }
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [design, specKey, quantity, hydrated]);

  function restoreDraft() {
    if (!draft) return;
    setDesign(draft.design);
    setSpecKey(draft.specKey);
    setQuantity(draft.quantity || 1000);
    setDraft(null);
    toast.success("Rascunho restaurado com as mesmas medidas e formato");
  }

  function discardDraft() {
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    setDraft(null);
  }

  const missingProduct = !!produto && !baseProduct.isPending && !baseProduct.data;

  const save = useMutation({
    mutationFn: async () => {
      const res = await saveFn({ data: { ...design, thumbnail: null } });
      return res.id;
    },
    onSuccess: (id) => {
      setDesign((d) => ({ ...d, id }));
      qc.invalidateQueries({ queryKey: ["label-designs"] });
      toast.success("Rascunho salvo — você pode voltar depois e continuar de onde parou");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível salvar"),
  });

  const addToCart = useMutation({
    mutationFn: async () => {
      const { id } = await saveFn({ data: { ...design, thumbnail: null } });
      setDesign((d) => ({ ...d, id }));
      await addFn({ data: { design_id: id, quantity } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart", "me"] });
      qc.invalidateQueries({ queryKey: ["label-designs"] });
      discardDraft();
      toast.success("Etiqueta personalizada adicionada ao carrinho");
      navigate({ to: "/carrinho" });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível adicionar ao carrinho"),
  });

  const removeDesign = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["label-designs"] });
      toast.success("Rascunho excluído");
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível excluir"),
  });

  return (
    <div className="container-page py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Editor de etiqueta personalizada
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monte a arte, salve como rascunho e volte depois — medidas, formato, grade e espaçamentos
            voltam exatamente como estavam.
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link to="/etiquetas/personalizada">Como funciona</Link>
        </Button>
      </header>

      {missingProduct && (
        <div className="mb-8 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium">Esta etiqueta não está habilitada para personalização.</p>
          <p className="mt-1 text-muted-foreground">
            Escolha uma etiqueta-base abaixo ou volte ao catálogo para selecionar outro produto.
          </p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link to="/catalogo">Ver catálogo</Link>
          </Button>
        </div>
      )}

      {draft && (
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border hairline bg-card p-4 text-sm">
          <div>
            <p className="font-medium">Rascunho não salvo encontrado neste navegador</p>
            <p className="text-muted-foreground">
              “{draft.design.name}” · {draft.design.width_mm} × {draft.design.height_mm} mm ·{" "}
              {SHAPE_LABELS[draft.design.shape]} ·{" "}
              {new Date(draft.savedAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={restoreDraft}>
              Continuar rascunho
            </Button>
            <Button size="sm" variant="ghost" onClick={discardDraft}>
              Descartar
            </Button>
          </div>
        </div>
      )}

      {(designs.data?.length ?? 0) > 0 && (
        <section className="mb-8 rounded-lg border hairline bg-card p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Meus rascunhos salvos
          </h2>
          <ul className="flex flex-wrap gap-2">
            {designs.data!.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-md border hairline px-2 py-1">
                <button
                  type="button"
                  className="text-left text-sm hover:text-primary"
                  onClick={() => {
                    loadSaved(d);
                    toast.success(`Rascunho “${d.name}” carregado`);
                  }}
                >
                  <span className="block">{d.name}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {Number(d.width_mm)} × {Number(d.height_mm)} mm ·{" "}
                    {SHAPE_LABELS[(d.shape ?? "rect") as LabelShape]}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Excluir ${d.name}`}
                  onClick={() => removeDesign.mutate(d.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LabelEditor
        design={design}
        onChange={setDesign}
        products={productList}
        tiers={tiers.data ?? []}
        quantity={quantity}
        onQuantityChange={setQuantity}
        onSave={() => save.mutate()}
        onAddToCart={() => {
          if (!design.base_product_id) {
            toast.error("Escolha a etiqueta-base antes de adicionar ao carrinho");
            return;
          }
          addToCart.mutate();
        }}
        saving={save.isPending}
        adding={addToCart.isPending}
        canAddToCart={!!design.base_product_id}
      />
    </div>
  );
}
