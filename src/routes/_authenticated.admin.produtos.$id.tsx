import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { productPreviewOptions } from "@/lib/admin.queries";
import {
  updateProductDimensions,
  setSellsByKit,
  upsertProductKit,
  deleteProductKit,
} from "@/lib/admin.functions";
import { publicMediaUrl } from "@/lib/enrichment.functions";
import { isNonAdhesiveProduct, sanitizeTechnicalDescription, NON_ADHESIVE_PAPER_150_SPECS_HTML } from "@/lib/sanitize-technical";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, ExternalLink, ImageOff, Sparkles, Package, Loader2, Boxes, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";


import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomizationTab } from "@/components/admin/product/customization-tab";
import { productEditorOptions } from "@/lib/admin.queries";
import { BasicsTab } from "@/components/admin/product/basics-tab";
import { MarketplacesTab } from "@/components/admin/product/marketplaces-tab";
import { PricingTab } from "@/components/admin/product/pricing-tab";
import { ContentTab } from "@/components/admin/product/content-tab";
import { SeoTab } from "@/components/admin/product/seo-tab";
import { MediaTab } from "@/components/admin/product/media-tab";
import { BadgesTab } from "@/components/admin/product/badges-tab";
import { BundlesTab } from "@/components/admin/product/bundles-tab";
import { duplicateProduct, deleteProduct } from "@/lib/admin.product.functions";
import { updateProductStatus } from "@/lib/admin.functions";
import { useNavigate } from "@tanstack/react-router";

const previewOptions = productPreviewOptions;

export const Route = createFileRoute("/_authenticated/admin/produtos/$id")({
  head: () => ({ meta: [{ title: "Editar produto — Admin" }, { name: "robots", content: "noindex" }] }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(previewOptions(params.id)),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Erro ao carregar produto: {error.message}</p>
        <Button size="sm" variant="outline" onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
      </div>
    );
  },
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Produto não encontrado.</p>,
  component: ProductEditorPage,
});

function ProductEditorPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(productEditorOptions(id));
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dup = useServerFn(duplicateProduct);
  const del = useServerFn(deleteProduct);
  const setStatus = useServerFn(updateProductStatus);
  const [busy, setBusy] = useState(false);
  const product = data.product as any;

  async function act(fn: () => Promise<unknown>, msg: string) {
    setBusy(true);
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["admin"] });
      toast.success(msg);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/produtos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar para lista
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{product.name}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={product.status === "published" ? "default" : "outline"}>{product.status}</Badge>
          <a
            href={`/produto/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Ver na loja <ExternalLink className="h-3 w-3" />
          </a>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(
                () => setStatus({ data: { productId: id, status: product.status === "published" ? "hidden" : "published" } }),
                product.status === "published" ? "Produto ocultado" : "Produto publicado",
              )
            }
          >
            {product.status === "published" ? "Ocultar" : "Publicar"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() =>
              act(async () => {
                const res = await dup({ data: { productId: id } });
                navigate({ to: "/admin/produtos/$id", params: { id: res.id } });
              }, "Produto duplicado")
            }
          >
            Duplicar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (confirm("Descontinuar este produto? Ele sai da loja mas o histórico é preservado."))
                act(() => del({ data: { productId: id, hard: false } }), "Produto descontinuado");
            }}
          >
            Descontinuar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={busy}
            onClick={() => {
              const typed = window.prompt(`Digite o nome do produto para excluir definitivamente:\n${product.name}`);
              if (typed !== product.name) return;
              act(async () => {
                await del({ data: { productId: id, hard: true } });
                navigate({ to: "/admin/produtos" });
              }, "Produto excluído");
            }}
          >
            <Trash2 className="mr-1 h-3 w-3" /> Excluir
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basics">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="basics">Visão geral</TabsTrigger>
          <TabsTrigger value="content">Conteúdo/CMS</TabsTrigger>
          <TabsTrigger value="pricing">Preço &amp; Estoque</TabsTrigger>
          <TabsTrigger value="media">Mídia</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="custom">Personalização</TabsTrigger>
          <TabsTrigger value="kits">Kits &amp; Frete</TabsTrigger>
          <TabsTrigger value="bundles">Compre Junto</TabsTrigger>
          <TabsTrigger value="badges">Selos</TabsTrigger>
          <TabsTrigger value="marketplaces">Marketplaces</TabsTrigger>
          <TabsTrigger value="preview">Prévia</TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="mt-4">
          <BasicsTab
            product={product}
            allCategories={data.allCategories as any}
            brands={data.brands as any}
            categoryLinks={data.categoryLinks as any}
          />
        </TabsContent>
        <TabsContent value="content" className="mt-4">
          <ContentTab product={product} faqs={data.faqs as any} />
        </TabsContent>
        <TabsContent value="pricing" className="mt-4">
          <PricingTab product={product} />
        </TabsContent>
        <TabsContent value="media" className="mt-4">
          <MediaTab productId={id} images={data.images as any} videos={data.videos as any} />
        </TabsContent>
        <TabsContent value="seo" className="mt-4">
          <SeoTab product={product} images={data.images as any} redirects={data.redirects as any} />
        </TabsContent>
        <TabsContent value="custom" className="mt-4">
          <CustomizationTab product={product} />
        </TabsContent>
        <TabsContent value="kits" className="mt-4 space-y-4">
          <DimensionsCard product={product} />
          <KitsCard productId={id} sellsByKit={!!product.sells_by_kit} kits={(data.kits ?? []) as KitRow[]} />
        </TabsContent>
        <TabsContent value="bundles" className="mt-4">
          <BundlesTab productId={id} productName={product.name} />
        </TabsContent>
        <TabsContent value="badges" className="mt-4">
          <BadgesTab productId={id} badges={data.badges as any} assignments={data.badgeAssignments as any} />
        </TabsContent>
        <TabsContent value="marketplaces" className="mt-4">
          <MarketplacesTab product={product} />
        </TabsContent>
        <TabsContent value="preview" className="mt-4">
          <PreviewPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PreviewPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(previewOptions(id));
  const { product, images, faqs, categories, kits } = data as typeof data & { kits: KitRow[] };
  const [activeIdx, setActiveIdx] = useState(0);

  const resolvedImages = images
    .map((img) => ({
      ...img,
      url: publicMediaUrl(img.storage_path) ?? img.source_url ?? null,
    }))
    .filter((i) => !!i.url);
  const mainIdx = Math.min(activeIdx, Math.max(0, resolvedImages.length - 1));
  const main = resolvedImages[mainIdx];

  const price = product.promotional_price ?? product.price;
  const hasPromo = product.promotional_price != null && product.price != null && Number(product.promotional_price) < Number(product.price);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/admin/produtos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar para lista
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={product.status === "published" ? "default" : product.status === "enriched" ? "secondary" : "outline"}>
            {product.status}
          </Badge>
          {product.old_url && (
            <a href={product.old_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              URL original <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_1.2fr]">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
            {main?.url ? (
              <img src={main.url} alt={main.alt_text ?? product.name} className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff className="h-10 w-10" />
                <p className="text-sm">Sem imagem migrada</p>
              </div>
            )}
          </div>
          {resolvedImages.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {resolvedImages.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveIdx(i)}
                  className={`h-16 w-16 overflow-hidden rounded border ${i === mainIdx ? "ring-2 ring-primary" : ""}`}
                >
                  <img src={img.url!} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {resolvedImages.length} imagem(ns) disponíveis · {images.filter((i) => i.storage_path).length} migradas para Storage
          </p>
        </div>

        {/* Content */}
        <div className="space-y-5">
          <div>
            <p className="eyebrow text-xs">{categories.map((c) => c?.name).filter(Boolean).join(" · ") || "Sem categoria"}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              SKU: {product.sku ?? "—"} · Modelo: {product.model ?? "—"} · Ref: {product.reference ?? "—"}
            </p>
          </div>

          <div className="flex items-baseline gap-3">
            {price != null ? (
              <>
                <span className="text-2xl font-semibold tabular-nums">{Number(price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                {hasPromo && <span className="text-sm text-muted-foreground line-through">{Number(product.price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>}
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Preço a consultar</span>
            )}
            <span className="text-xs text-muted-foreground">
              {product.is_available ? "Disponível" : "Indisponível"} · Estoque: {product.stock_quantity ?? "—"}
            </span>
          </div>

          {product.short_description && (
            <p className="text-sm text-muted-foreground">{product.short_description}</p>
          )}

          {product.commercial_description ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Sparkles className="h-4 w-4" /> Descrição comercial (IA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2"
                  dangerouslySetInnerHTML={{ __html: product.commercial_description }}
                />
              </CardContent>
            </Card>
          ) : (
            <p className="text-sm italic text-muted-foreground">Ainda sem descrição enriquecida.</p>
          )}

          {(() => {
            const nonAdhesive = isNonAdhesiveProduct({ name: product.name, sku: product.sku });
            const cleaned = sanitizeTechnicalDescription(product.technical_description, {
              isAdhesive: !nonAdhesive,
            });
            const paperSpec = nonAdhesive ? NON_ADHESIVE_PAPER_150_SPECS_HTML : "";
            const html = [cleaned, paperSpec].filter(Boolean).join("\n");
            if (!html) return null;
            return (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Descrição técnica (origem)</CardTitle></CardHeader>
                <CardContent>
                  <div
                    className="prose prose-sm max-w-none prose-p:my-2 prose-table:text-xs"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                </CardContent>
              </Card>
            );
          })()}

          {faqs.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Perguntas frequentes</CardTitle></CardHeader>
              <CardContent>
                <Accordion type="single" collapsible>
                  {faqs.map((f) => (
                    <AccordionItem key={f.id} value={f.id}>
                      <AccordionTrigger className="text-left text-sm">{f.question}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">{f.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          <DimensionsCard product={product} />

          <KitsCard
            productId={product.id}
            sellsByKit={!!(product as any).sells_by_kit}
            kits={kits ?? []}
          />




          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">SEO</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-xs uppercase text-muted-foreground">Título</span><p>{product.seo_title ?? "—"}</p></div>
              <div><span className="text-xs uppercase text-muted-foreground">Descrição</span><p className="text-muted-foreground">{product.seo_description ?? "—"}</p></div>
              <div><span className="text-xs uppercase text-muted-foreground">Palavras-chave</span><p className="text-muted-foreground">{product.seo_keywords ?? "—"}</p></div>
              <div><span className="text-xs uppercase text-muted-foreground">Slug</span><p className="font-mono text-xs">{product.slug}</p></div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

type ProductDims = {
  id: string;
  weight_kg: number | null;
  width_mm: number | null;
  height_mm: number | null;
  length_mm: number | null;
};

function DimensionsCard({ product }: { product: ProductDims }) {
  const update = useServerFn(updateProductDimensions);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    weight_kg: product.weight_kg != null ? String(product.weight_kg) : "",
    width_mm: product.width_mm != null ? String(product.width_mm) : "",
    height_mm: product.height_mm != null ? String(product.height_mm) : "",
    length_mm: product.length_mm != null ? String(product.length_mm) : "",
  });
  const [saving, setSaving] = useState(false);

  function parseNum(v: string): number | null {
    if (v.trim() === "") return null;
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }

  async function onSave() {
    setSaving(true);
    try {
      await update({
        data: {
          productId: product.id,
          weight_kg: parseNum(form.weight_kg),
          width_mm: parseNum(form.width_mm),
          height_mm: parseNum(form.height_mm),
          length_mm: parseNum(form.length_mm),
        },
      });
      await qc.invalidateQueries({ queryKey: ["admin", "product-preview", product.id] });
      toast.success("Dimensões atualizadas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ label, unit, k }: { label: string; unit: string; k: keyof typeof form }) => (
    <label className="block">
      <span className="text-xs uppercase text-muted-foreground">{label} ({unit})</span>
      <input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={form[k]}
        onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))}
        className="mt-1 w-full rounded-md border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary/50"
        placeholder="—"
      />
    </label>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4" /> Dimensões e peso (para cotação de frete)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Peso" unit="kg" k="weight_kg" />
          <Field label="Largura" unit="mm" k="width_mm" />
          <Field label="Altura" unit="mm" k="height_mm" />
          <Field label="Comprimento" unit="mm" k="length_mm" />
        </div>
        <p className="text-xs text-muted-foreground">
          Use kg reais (ex.: 0.5 = 500 g) e milímetros da embalagem. Estes valores são enviados ao Melhor Envio.
        </p>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
          Salvar dimensões
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Kits (venda por embalagens fechadas)
// ============================================================================

type KitRow = {
  id: string;
  name: string | null;
  sku: string | null;
  units_per_pack: number | null;
  price: number | null;
  promotional_price: number | null;
  stock_mode: "own" | "derived" | null;
  stock_quantity: number | null;
  weight_kg: number | null;
  width_mm: number | null;
  height_mm: number | null;
  length_mm: number | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type KitDraft = {
  id?: string;
  name: string;
  sku: string;
  units_per_pack: string;
  price: string;
  promotional_price: string;
  stock_mode: "own" | "derived";
  stock_quantity: string;
  weight_kg: string;
  width_mm: string;
  height_mm: string;
  length_mm: string;
  sort_order: string;
  is_active: boolean;
};

function emptyDraft(order: number): KitDraft {
  return {
    name: "",
    sku: "",
    units_per_pack: "",
    price: "",
    promotional_price: "",
    stock_mode: "derived",
    stock_quantity: "",
    weight_kg: "",
    width_mm: "",
    height_mm: "",
    length_mm: "",
    sort_order: String(order),
    is_active: true,
  };
}

function toDraft(k: KitRow): KitDraft {
  const s = (v: number | null) => (v != null ? String(v) : "");
  return {
    id: k.id,
    name: k.name ?? "",
    sku: k.sku ?? "",
    units_per_pack: s(k.units_per_pack),
    price: s(k.price),
    promotional_price: s(k.promotional_price),
    stock_mode: k.stock_mode === "own" ? "own" : "derived",
    stock_quantity: s(k.stock_quantity),
    weight_kg: s(k.weight_kg),
    width_mm: s(k.width_mm),
    height_mm: s(k.height_mm),
    length_mm: s(k.length_mm),
    sort_order: s(k.sort_order),
    is_active: k.is_active !== false,
  };
}

function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function KitsCard({
  productId,
  sellsByKit,
  kits,
}: {
  productId: string;
  sellsByKit: boolean;
  kits: KitRow[];
}) {
  const qc = useQueryClient();
  const toggleFn = useServerFn(setSellsByKit);
  const upsertFn = useServerFn(upsertProductKit);
  const deleteFn = useServerFn(deleteProductKit);
  const [enabled, setEnabled] = useState(sellsByKit);
  const [drafts, setDrafts] = useState<KitDraft[]>(() =>
    kits.length > 0 ? kits.map(toDraft) : [],
  );
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(next: boolean) {
    setEnabled(next);
    try {
      await toggleFn({ data: { productId, sells_by_kit: next } });
      await qc.invalidateQueries({ queryKey: ["admin", "product-preview", productId] });
      toast.success(next ? "Venda por kits ativada" : "Venda por kits desativada");
    } catch (e) {
      setEnabled(!next);
      toast.error((e as Error).message);
    }
  }

  function updateDraft(idx: number, patch: Partial<KitDraft>) {
    setDrafts((d) => d.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function saveDraft(idx: number) {
    const d = drafts[idx];
    const units = parseNum(d.units_per_pack);
    const price = parseNum(d.price);
    if (!d.name.trim()) return toast.error("Nome do kit é obrigatório");
    if (units == null || units < 1) return toast.error("Unidades por caixa inválido");
    if (price == null) return toast.error("Preço da caixa é obrigatório");
    setBusy(d.id ?? `new-${idx}`);
    try {
      const res = await upsertFn({
        data: {
          id: d.id,
          productId,
          name: d.name.trim(),
          sku: d.sku.trim() || null,
          units_per_pack: units,
          price,
          promotional_price: parseNum(d.promotional_price),
          stock_mode: d.stock_mode,
          stock_quantity: d.stock_mode === "own" ? (parseNum(d.stock_quantity) ?? 0) : null,
          weight_kg: parseNum(d.weight_kg),
          width_mm: parseNum(d.width_mm),
          height_mm: parseNum(d.height_mm),
          length_mm: parseNum(d.length_mm),
          sort_order: Number(parseNum(d.sort_order) ?? idx),
          is_active: d.is_active,
        },
      });
      if (!d.id) updateDraft(idx, { id: res.id });
      await qc.invalidateQueries({ queryKey: ["admin", "product-preview", productId] });
      toast.success("Kit salvo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removeDraft(idx: number) {
    const d = drafts[idx];
    if (!d.id) {
      setDrafts((rows) => rows.filter((_, i) => i !== idx));
      return;
    }
    if (!confirm(`Remover kit "${d.name}"?`)) return;
    setBusy(d.id);
    try {
      await deleteFn({ data: { id: d.id, productId } });
      setDrafts((rows) => rows.filter((_, i) => i !== idx));
      await qc.invalidateQueries({ queryKey: ["admin", "product-preview", productId] });
      toast.success("Kit removido");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function addRow() {
    setDrafts((rows) => [...rows, emptyDraft(rows.length)]);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Boxes className="h-4 w-4" /> Venda por kits fechados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => toggle(e.target.checked)}
            className="h-4 w-4"
          />
          <span>
            Este produto é vendido apenas em <strong>caixas fechadas</strong> (o cliente escolhe uma
            das opções abaixo — não pode digitar quantidade livre).
          </span>
        </label>

        {enabled && (
          <div className="space-y-3">
            {drafts.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Nenhum kit cadastrado ainda — adicione ao menos uma opção.
              </p>
            )}
            {drafts.map((d, idx) => (
              <div key={d.id ?? `new-${idx}`} className="rounded-md border p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <TextField label="Nome" value={d.name} onChange={(v) => updateDraft(idx, { name: v })} placeholder="Caixa com 100" />
                  <TextField label="SKU" value={d.sku} onChange={(v) => updateDraft(idx, { sku: v })} placeholder="Opcional" />
                  <TextField label="Un/caixa" value={d.units_per_pack} onChange={(v) => updateDraft(idx, { units_per_pack: v })} type="number" />
                  <TextField label="Preço (R$)" value={d.price} onChange={(v) => updateDraft(idx, { price: v })} type="number" />
                  <TextField label="Preço promo (R$)" value={d.promotional_price} onChange={(v) => updateDraft(idx, { promotional_price: v })} type="number" />
                  <label className="block">
                    <span className="text-xs uppercase text-muted-foreground">Estoque</span>
                    <select
                      value={d.stock_mode}
                      onChange={(e) => updateDraft(idx, { stock_mode: e.target.value as "own" | "derived" })}
                      className="mt-1 w-full rounded-md border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary/50"
                    >
                      <option value="derived">Derivado do estoque unitário</option>
                      <option value="own">Estoque próprio da caixa</option>
                    </select>
                  </label>
                  {d.stock_mode === "own" && (
                    <TextField label="Caixas em estoque" value={d.stock_quantity} onChange={(v) => updateDraft(idx, { stock_quantity: v })} type="number" />
                  )}
                  <TextField label="Ordem" value={d.sort_order} onChange={(v) => updateDraft(idx, { sort_order: v })} type="number" />
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <TextField label="Peso caixa (kg)" value={d.weight_kg} onChange={(v) => updateDraft(idx, { weight_kg: v })} type="number" />
                  <TextField label="Largura (mm)" value={d.width_mm} onChange={(v) => updateDraft(idx, { width_mm: v })} type="number" />
                  <TextField label="Altura (mm)" value={d.height_mm} onChange={(v) => updateDraft(idx, { height_mm: v })} type="number" />
                  <TextField label="Comprimento (mm)" value={d.length_mm} onChange={(v) => updateDraft(idx, { length_mm: v })} type="number" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={d.is_active}
                      onChange={(e) => updateDraft(idx, { is_active: e.target.checked })}
                    />
                    Ativo (exibido na loja)
                  </label>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => removeDraft(idx)} disabled={busy != null}>
                      <Trash2 className="mr-1 h-3 w-3" /> Remover
                    </Button>
                    <Button size="sm" onClick={() => saveDraft(idx)} disabled={busy != null}>
                      {busy === (d.id ?? `new-${idx}`) && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addRow}>
              <Plus className="mr-1 h-3 w-3" /> Adicionar kit
            </Button>
            <p className="text-xs text-muted-foreground">
              Dimensões e peso da <strong>caixa</strong> são usados pelo Melhor Envio quando este
              kit é escolhido. Se o cliente comprar N caixas, N volumes serão despachados.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "—"}
        className="mt-1 w-full rounded-md border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary/50"
      />
    </label>
  );
}

