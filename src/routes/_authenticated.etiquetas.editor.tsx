import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
} from "@/lib/labels.functions";
import {
  designFromSpec,
  emptyDesign,
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
  const baseProduct = useQuery({
    queryKey: ["label-product", produto],
    queryFn: () => productFn({ data: { slug: produto! } }),
    enabled: !!produto,
    staleTime: 300_000,
  });

  const [design, setDesign] = useState<LabelDesign>(() => emptyDesign());
  const [quantity, setQuantity] = useState(1000);
  const [hydrated, setHydrated] = useState(false);

  // Lista de etiquetas-base + a ficha do produto vindo da URL (pode não estar na lista)
  const productList = useMemo(() => {
    const list = products.data ?? [];
    const extra = baseProduct.data;
    return extra && !list.some((p) => p.id === extra.id) ? [extra, ...list] : list;
  }, [products.data, baseProduct.data]);

  // Carrega modelo salvo ou pré-configura o editor com a ficha do produto escolhido
  useEffect(() => {
    if (hydrated) return;
    if (designId) {
      const found = designs.data?.find((d) => d.id === designId);
      if (!found) return;
      setDesign({
        id: found.id,
        name: found.name,
        base_product_id: found.base_product_id,
        width_mm: Number(found.width_mm),
        height_mm: Number(found.height_mm),
        shape: (found.shape ?? "rect") as LabelShape,
        corner_radius_mm: found.corner_radius_mm == null ? null : Number(found.corner_radius_mm),
        material: found.material,
        ribbon_color: found.ribbon_color,
        background_color: found.background_color,
        layout: (found.layout ?? []) as LabelLayer[],
      });
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
    setHydrated(true);
  }, [designId, produto, designs.data, baseProduct.data, baseProduct.isPending, hydrated]);

  const missingProduct = !!produto && !baseProduct.isPending && !baseProduct.data;

  const save = useMutation({
    mutationFn: async () => {
      const res = await saveFn({ data: { ...design, thumbnail: null } });
      return res.id;
    },
    onSuccess: (id) => {
      setDesign((d) => ({ ...d, id }));
      qc.invalidateQueries({ queryKey: ["label-designs"] });
      toast.success("Modelo salvo");
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
      toast.success("Etiqueta personalizada adicionada ao carrinho");
      navigate({ to: "/carrinho" });
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível adicionar ao carrinho"),
  });

  const removeDesign = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["label-designs"] });
      toast.success("Modelo excluído");
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
            Monte a arte, escolha material e cor do ribbon, salve e finalize com frete no carrinho.
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


      {(designs.data?.length ?? 0) > 0 && (
        <section className="mb-8 rounded-lg border hairline bg-card p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Meus modelos salvos
          </h2>
          <ul className="flex flex-wrap gap-2">
            {designs.data!.map((d) => (
              <li key={d.id} className="flex items-center gap-1 rounded-md border hairline px-2 py-1">
                <button
                  type="button"
                  className="text-sm hover:text-primary"
                  onClick={() => {
                    setDesign({
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
                    });
                    toast.success(`Modelo “${d.name}” carregado`);
                  }}
                >
                  {d.name}
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
        products={products.data ?? []}
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
