import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ImageOff, MessageCircle, Mail } from "lucide-react";
import { getProductBySlug } from "@/lib/catalog.functions";
import {
  isNonAdhesiveProduct,
  sanitizeTechnicalDescription,
  NON_ADHESIVE_PAPER_150_SPECS_HTML,
} from "@/lib/sanitize-technical";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const productOptions = (slug: string) =>
  queryOptions({
    queryKey: ["public", "product", slug],
    queryFn: async () => {
      const p = await getProductBySlug({ data: { slug } });
      if (!p) throw notFound();
      return p;
    },
    staleTime: 5 * 60_000,
  });

export const Route = createFileRoute("/produto/$slug")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(productOptions(params.slug)),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Produto não encontrado — Adeconex" }, { name: "robots", content: "noindex" }] };
    }
    const title = loaderData.seo_title ?? `${loaderData.name} — Adeconex`;
    const description =
      loaderData.seo_description ??
      loaderData.short_description ??
      `${loaderData.name} — encontre na Adeconex, referência em impressão térmica e etiquetas.`;
    const image = loaderData.images[0]?.url;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        ...(image ? [{ property: "og:image", content: image }] : []),
      ],
    };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="container-page py-20 text-center">
        <p className="text-sm text-destructive">Erro: {error.message}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          Tentar novamente
        </Button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="container-page py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Produto não encontrado</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Este item pode ter sido descontinuado ou movido.
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/catalogo">Voltar ao catálogo</Link>
      </Button>
    </div>
  ),
  component: ProductPage,
});

function money(v: number | null): string | null {
  if (v === null || v === undefined) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProductPage() {
  const { slug } = Route.useParams();
  const { data: p } = useSuspenseQuery(productOptions(slug));
  const [idx, setIdx] = useState(0);

  const price = money(p.promotional_price ?? p.price);
  const strike =
    p.promotional_price != null && p.price != null && p.promotional_price < p.price
      ? money(p.price)
      : null;

  const nonAdhesive = isNonAdhesiveProduct({ name: p.name, sku: p.sku });
  const cleanedTech = sanitizeTechnicalDescription(p.technical_description, {
    isAdhesive: !nonAdhesive,
  });
  const techHtml = [cleanedTech, nonAdhesive ? NON_ADHESIVE_PAPER_150_SPECS_HTML : ""]
    .filter(Boolean)
    .join("\n");

  const main = p.images[Math.min(idx, Math.max(0, p.images.length - 1))];
  const waMsg = encodeURIComponent(
    `Olá! Tenho interesse no produto: ${p.name}${p.sku ? ` (SKU ${p.sku})` : ""}.`,
  );

  return (
    <section className="pb-20 pt-8">
      <div className="container-page">
        <Link
          to="/catalogo"
          className="mb-6 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao catálogo
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_1.1fr]">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-lg border hairline bg-surface-2">
              {main ? (
                <img
                  src={main.url}
                  alt={main.alt}
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                  <ImageOff className="h-10 w-10" />
                </div>
              )}
            </div>
            {p.images.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {p.images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setIdx(i)}
                    className={`h-16 w-16 overflow-hidden rounded border hairline bg-surface-3 ${
                      i === idx ? "ring-2 ring-signal" : ""
                    }`}
                    aria-label={`Ver imagem ${i + 1}`}
                  >
                    <img
                      src={img.url}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            <div>
              {p.categories.length > 0 && (
                <p className="eyebrow text-muted-foreground">
                  {p.categories.map((c) => c.name).join(" · ")}
                </p>
              )}
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                {p.name}
              </h1>
              <p className="mt-2 text-xs text-muted-foreground">
                {p.sku && <>SKU: {p.sku} · </>}
                {p.model && <>Modelo: {p.model} · </>}
                {p.reference && <>Ref: {p.reference}</>}
              </p>
            </div>

            <div className="flex items-baseline gap-3">
              {price ? (
                <>
                  <span className="text-3xl font-semibold tabular-nums">{price}</span>
                  {strike && (
                    <span className="text-sm text-muted-foreground line-through">
                      {strike}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Sob consulta</span>
              )}
              <Badge variant={p.is_available ? "default" : "outline"}>
                {p.is_available ? "Disponível" : "Sob consulta"}
              </Badge>
            </div>

            {p.short_description && (
              <p className="text-sm text-muted-foreground">{p.short_description}</p>
            )}

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <a
                  href={`https://wa.me/5527999999999?text=${waMsg}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/contato">
                  <Mail className="mr-2 h-4 w-4" /> Solicitar cotação
                </Link>
              </Button>
            </div>

            {p.commercial_description && (
              <div
                className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2"
                dangerouslySetInnerHTML={{ __html: p.commercial_description }}
              />
            )}
          </div>
        </div>

        {techHtml && (
          <div className="mt-12 rounded-lg border hairline bg-surface-2 p-6">
            <h2 className="mb-4 font-display text-xl font-semibold">Ficha técnica</h2>
            <div
              className="prose prose-sm max-w-none prose-p:my-2 prose-table:text-xs"
              dangerouslySetInnerHTML={{ __html: techHtml }}
            />
          </div>
        )}

        {p.faqs.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-4 font-display text-xl font-semibold">Perguntas frequentes</h2>
            <Accordion type="single" collapsible>
              {p.faqs.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-left text-sm">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </section>
  );
}
