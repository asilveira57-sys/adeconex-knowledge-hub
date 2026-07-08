import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { productPreviewOptions } from "@/lib/admin.queries";
import { publicMediaUrl } from "@/lib/enrichment.functions";
import { isNonAdhesiveProduct, sanitizeTechnicalDescription, NON_ADHESIVE_PAPER_150_SPECS_HTML } from "@/lib/sanitize-technical";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, ExternalLink, ImageOff, Sparkles } from "lucide-react";

const previewOptions = productPreviewOptions;

export const Route = createFileRoute("/_authenticated/admin/produtos/$id")({
  head: () => ({ meta: [{ title: "Preview de produto — Admin" }, { name: "robots", content: "noindex" }] }),
  loader: ({ params, context }) => context.queryClient.ensureQueryData(previewOptions(params.id)),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Erro ao carregar preview: {error.message}</p>
        <Button size="sm" variant="outline" onClick={() => { router.invalidate(); reset(); }}>Tentar novamente</Button>
      </div>
    );
  },
  notFoundComponent: () => <p className="text-sm text-muted-foreground">Produto não encontrado.</p>,
  component: PreviewPage,
});

function PreviewPage() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(previewOptions(id));
  const { product, images, faqs, categories } = data;
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
                <span className="text-2xl font-semibold tabular-nums">R$ {Number(price).toFixed(2)}</span>
                {hasPromo && <span className="text-sm text-muted-foreground line-through">R$ {Number(product.price).toFixed(2)}</span>}
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
