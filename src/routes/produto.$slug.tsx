import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ImageOff, MessageCircle, Mail, CheckCircle2, ShieldCheck, Truck, Award, ShoppingCart, Minus, Plus, ExternalLink } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { trackMarketplaceClick } from "@/lib/analytics";
import { getProductBySlug } from "@/lib/catalog.functions";
import {
  isNonAdhesiveProduct,
  sanitizeTechnicalDescription,
  NON_ADHESIVE_PAPER_150_SPECS_HTML,
} from "@/lib/sanitize-technical";
import { formatCommercialHtml } from "@/lib/format-commercial";
import { BASE_URL, absoluteUrl } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ShippingCepQuote } from "@/components/shipping-cep-quote";
import { BundleOffersSection } from "@/components/bundle-offers-section";
import { Badge } from "@/components/ui/badge";
import { ProductBadgePills } from "@/components/product-badge-pills";
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
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Produto não encontrado — Adeconex" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData;
    const url = absoluteUrl(`/produto/${params.slug}`);
    const title = p.seo_title ?? `${p.name} — Adeconex`;
    const description =
      p.seo_description ??
      p.short_description ??
      `${p.name} — impressão térmica, etiquetas e ribbon com a autoridade Adeconex.`;
    const image = p.images[0]?.url;
    const keywords =
      p.seo_keywords ??
      [p.name, p.sku, p.model, ...p.categories.map((c) => c.name), "Adeconex", "impressão térmica", "etiquetas"]
        .filter(Boolean)
        .join(", ");

    const priceNum = p.promotional_price ?? p.price;
    const productSchema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description,
      sku: p.sku ?? undefined,
      mpn: p.reference ?? undefined,
      brand: { "@type": "Brand", name: "Adeconex" },
      image: image ? [image] : undefined,
      category: p.categories[0]?.name,
      url,
    };
    if (priceNum != null) {
      productSchema.offers = {
        "@type": "Offer",
        priceCurrency: "BRL",
        price: priceNum,
        availability: p.is_available
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
        url,
        seller: { "@type": "Organization", name: "Adeconex" },
      };
    }

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Catálogo", item: absoluteUrl("/catalogo") },
        { "@type": "ListItem", position: 3, name: p.name, item: url },
      ],
    };

    const faqSchema =
      p.faqs.length > 0
        ? {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: p.faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }
        : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "keywords", content: keywords },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(productSchema) },
        { type: "application/ld+json", children: JSON.stringify(breadcrumbSchema) },
        ...(faqSchema
          ? [{ type: "application/ld+json", children: JSON.stringify(faqSchema) }]
          : []),
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
  const [qty, setQty] = useState(1);
  const { add } = useCart();

  const isKitMode = p.sells_by_kit && p.kits.length > 0;

  // Kit selection state (kit mode)
  const [selectedKitId, setSelectedKitId] = useState<string | null>(
    isKitMode ? p.kits[0].id : null,
  );
  const selectedKit = isKitMode
    ? p.kits.find((k) => k.id === selectedKitId) ?? p.kits[0]
    : null;

  // Variant selection state — one selected value per option name
  const [selectedOpts, setSelectedOpts] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (!isKitMode && p.variants.length > 0) {
      const first = p.variants[0];
      if (first.option1_name && first.option1_value) initial[first.option1_name] = first.option1_value;
      if (first.option2_name && first.option2_value) initial[first.option2_name] = first.option2_value;
    }
    return initial;
  });

  const selectedVariant =
    !isKitMode && p.variants.length > 0
      ? p.variants.find((v) => {
          const m1 = !v.option1_name || selectedOpts[v.option1_name] === v.option1_value;
          const m2 = !v.option2_name || selectedOpts[v.option2_name] === v.option2_value;
          return m1 && m2;
        }) ?? null
      : null;

  // Effective price/stock/sku — kit > variant > product
  const effPrice = selectedKit?.price ?? selectedVariant?.price ?? p.price;
  const effPromo = selectedKit?.promotional_price ?? selectedVariant?.promotional_price ?? p.promotional_price;
  const effStock = selectedKit
    ? selectedKit.stock_boxes
    : selectedVariant?.stock_quantity ?? p.stock_quantity;
  const effSku = selectedKit?.sku ?? selectedVariant?.sku ?? p.sku;
  const effAvailable = selectedKit
    ? selectedKit.stock_boxes == null || selectedKit.stock_boxes > 0
    : selectedVariant
      ? (selectedVariant.stock_quantity ?? 0) > 0
      : p.is_available;
  const activeVariantId = selectedKit?.id ?? selectedVariant?.id ?? null;
  const qtyUnitLabel = selectedKit ? (qty === 1 ? "caixa" : "caixas") : "un.";


  const price = money(effPromo ?? effPrice);
  const strike =
    effPromo != null && effPrice != null && effPromo < effPrice ? money(effPrice) : null;
  const discountPct =
    effPromo != null && effPrice != null && effPromo < effPrice
      ? Math.round((1 - effPromo / effPrice) * 100)
      : null;

  const nonAdhesive = isNonAdhesiveProduct({ name: p.name, sku: p.sku });
  const cleanedTech = sanitizeTechnicalDescription(p.technical_description, {
    isAdhesive: !nonAdhesive,
  });
  const techHtml = [cleanedTech, nonAdhesive ? NON_ADHESIVE_PAPER_150_SPECS_HTML : ""]
    .filter(Boolean)
    .join("\n");

  const commercialHtml = formatCommercialHtml(p.commercial_description);

  const main = p.images[Math.min(idx, Math.max(0, p.images.length - 1))];
  const variantLabel = selectedVariant
    ? Object.entries(selectedOpts)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ")
    : "";
  const waMsg = encodeURIComponent(
    `Olá! Tenho interesse no produto: ${p.name}${effSku ? ` (SKU ${effSku})` : ""}${
      variantLabel ? ` — ${variantLabel}` : ""
    }.`,
  );

  return (
    <article className="pb-24 pt-6">
      <div className="container-page">
        {/* Breadcrumbs */}
        <nav aria-label="Trilha de navegação" className="mb-6 flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Início</Link>
          <span aria-hidden>/</span>
          <Link to="/catalogo" className="hover:text-foreground">Catálogo</Link>
          {p.categories[0] && (
            <>
              <span aria-hidden>/</span>
              <span className="hover:text-foreground">{p.categories[0].name}</span>
            </>
          )}
          <span aria-hidden>/</span>
          <span className="truncate text-foreground/80">{p.name}</span>
        </nav>

        <Link
          to="/catalogo"
          className="mb-4 inline-flex items-center gap-1 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Voltar ao catálogo
        </Link>

        {/* Hero: gallery + purchase */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
          {/* Gallery — sticky */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="space-y-3">
              <div className="aspect-square overflow-hidden rounded-xl border hairline bg-surface-2 shadow-card">
                {main ? (
                  <img
                    src={main.url}
                    alt={main.alt}
                    className="h-full w-full object-contain p-4"
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
                      className={`h-16 w-16 overflow-hidden rounded-md border hairline bg-surface-3 transition ${
                        i === idx ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
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
          </div>

          {/* Info */}
          <div className="space-y-6">
            {p.categories.length > 0 && (
              <p className="eyebrow text-muted-foreground">
                {p.categories.map((c) => c.name).join(" · ")}
              </p>
            )}

            <ProductBadgePills badges={p.badges} size="md" />

            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl lg:text-[2.75rem]">
              {p.name}
            </h1>

            {p.short_description && (
              <p className="text-lg leading-relaxed text-muted-foreground">
                {p.short_description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
              {effSku && <span>SKU <span className="text-foreground">{effSku}</span></span>}
              {p.model && <span>Modelo <span className="text-foreground">{p.model}</span></span>}
              {p.reference && <span>Ref <span className="text-foreground">{p.reference}</span></span>}
            </div>

            {/* Kit selector (venda por caixas fechadas) */}
            {isKitMode && (
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
                    Escolha a embalagem
                  </span>
                  {selectedKit && (
                    <span className="text-sm font-medium text-foreground">
                      {selectedKit.units_per_pack} un/caixa
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {p.kits.map((k) => {
                    const active = selectedKit?.id === k.id;
                    const kPrice = k.promotional_price ?? k.price;
                    const unitPrice = kPrice != null ? kPrice / k.units_per_pack : null;
                    const outOfStock = k.stock_boxes != null && k.stock_boxes <= 0;
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => {
                          setSelectedKitId(k.id);
                          setQty(1);
                        }}
                        disabled={outOfStock}
                        className={`rounded-lg border p-3 text-left transition disabled:opacity-40 ${
                          active
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border bg-surface-2 hover:border-foreground/40"
                        }`}
                      >
                        <div className="text-sm font-semibold">{k.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {k.units_per_pack} unidades
                        </div>
                        {kPrice != null && (
                          <div className="mt-1 text-sm font-semibold tabular-nums">
                            {money(kPrice)}
                          </div>
                        )}
                        {unitPrice != null && (
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {money(unitPrice)} / un.
                          </div>
                        )}
                        {outOfStock && (
                          <div className="mt-1 text-xs text-destructive">Sem estoque</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Variant selectors (não usado quando venda por kit) */}
            {!isKitMode && p.variant_options.length > 0 && (
              <div className="space-y-4">
                {p.variant_options.map((opt) => (
                  <div key={opt.name}>
                    <div className="mb-2 flex items-baseline justify-between">
                      <span className="text-xs font-mono uppercase tracking-[0.14em] text-muted-foreground">
                        {opt.name}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {selectedOpts[opt.name] ?? "—"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {opt.values.map((val) => {
                        const active = selectedOpts[opt.name] === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setSelectedOpts((s) => ({ ...s, [opt.name]: val }))
                            }
                            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              active
                                ? "border-primary bg-primary/10 text-foreground ring-1 ring-primary"
                                : "border-border bg-surface-2 text-foreground/80 hover:border-foreground/40"
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}


            {/* Purchase card */}
            <div className="rounded-xl border hairline bg-card p-6 shadow-card">
              <div className="flex flex-wrap items-baseline gap-3">
                {price ? (
                  <>
                    <span className="font-display text-4xl font-semibold tabular-nums text-foreground">
                      {price}
                    </span>
                    {strike && (
                      <span className="text-base text-muted-foreground line-through">
                        {strike}
                      </span>
                    )}
                    {discountPct != null && (
                      <Badge className="bg-primary text-primary-foreground">
                        −{discountPct}%
                      </Badge>
                    )}
                  </>
                ) : (
                  <span className="text-lg font-medium text-muted-foreground">
                    Preço sob consulta
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    effAvailable ? "bg-emerald-500" : "bg-muted-foreground"
                  }`}
                  aria-hidden
                />
                <span className="text-muted-foreground">
                  {effAvailable
                    ? selectedKit
                      ? effStock != null && effStock <= 10
                        ? `Últimas ${effStock} ${effStock === 1 ? "caixa" : "caixas"}`
                        : "Disponível em caixas fechadas"
                      : selectedVariant && effStock != null && effStock <= 20
                        ? `Últimas ${effStock} unidades em estoque`
                        : "Disponível para pronta entrega"
                    : "Consulte disponibilidade"}
                </span>
              </div>

              {selectedKit && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Vendido apenas em caixas fechadas de{" "}
                  <strong className="text-foreground">
                    {selectedKit.units_per_pack} unidades
                  </strong>
                  .
                </p>
              )}

              {effAvailable && effPrice != null && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-lg border hairline bg-surface-2">
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="Diminuir"
                      className="p-2 text-foreground hover:bg-accent disabled:opacity-40"
                      disabled={qty <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium tabular-nums">{qty}</span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => (effStock != null ? Math.min(effStock, q + 1) : q + 1))}
                      aria-label="Aumentar"
                      className="p-2 text-foreground hover:bg-accent disabled:opacity-40"
                      disabled={effStock != null && qty >= effStock}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-muted-foreground">{qtyUnitLabel}</span>
                  {selectedKit && (
                    <span className="text-xs text-muted-foreground">
                      = {qty * selectedKit.units_per_pack} unidades
                    </span>
                  )}
                  <Button
                    size="lg"
                    className="flex-1 min-w-[200px]"
                    disabled={add.isPending}
                    onClick={() =>
                      add.mutate({
                        product_id: p.id,
                        variant_id: activeVariantId,
                        quantity: qty,
                      })
                    }
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    {add.isPending ? "Adicionando…" : "Adicionar ao carrinho"}
                  </Button>
                </div>
              )}

              <Button asChild size="lg" variant="outline" className="mt-3 w-full">
                <Link to="/etiquetas/editor" search={{ design: undefined, produto: p.slug }}>
                  <Wand2 className="mr-2 h-4 w-4" /> Personalizar esta etiqueta
                </Link>
              </Button>

              <ShippingCepQuote
                productId={p.id}
                variantId={activeVariantId}

                quantity={qty}
              />

              {p.mercado_livre_url && (
                <Button asChild size="lg" variant="secondary" className="mt-3 w-full">
                  <a
                    href={p.mercado_livre_url}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    data-analytics-id="marketplace-mercado-livre"
                    onClick={() =>
                      trackMarketplaceClick({
                        marketplace: "mercado_livre",
                        productId: p.id,
                        productName: p.name,
                        sku: effSku,
                        price: effPromo ?? effPrice,
                        url: p.mercado_livre_url!,
                      })
                    }
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> {p.mercado_livre_label}
                  </a>
                </Button>
              )}

              {p.shopee_url && (
                <Button asChild size="lg" variant="secondary" className="mt-3 w-full">
                  <a
                    href={p.shopee_url}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                    data-analytics-id="marketplace-shopee"
                    onClick={() =>
                      trackMarketplaceClick({
                        marketplace: "shopee",
                        productId: p.id,
                        productName: p.name,
                        sku: effSku,
                        price: effPromo ?? effPrice,
                        url: p.shopee_url!,
                      })
                    }
                  >
                    <ExternalLink className="mr-2 h-4 w-4" /> {p.shopee_label}
                  </a>
                </Button>
              )}

              {p.shopee_url && p.shopee_alternatives?.length > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Não encontrou na Shopee? Tente{" "}
                  {p.shopee_alternatives.map((alt, i) => (
                    <span key={alt.url}>
                      {i > 0 && " · "}
                      <a
                        href={alt.url}
                        target="_blank"
                        rel="nofollow noopener noreferrer"
                        className="text-primary hover:underline"
                        onClick={() =>
                          trackMarketplaceClick({
                            marketplace: "shopee",
                            productId: p.id,
                            productName: p.name,
                            sku: effSku,
                            price: effPromo ?? effPrice,
                            url: alt.url,
                          })
                        }
                      >
                        {alt.query ? `"${alt.query}"` : "a loja oficial"}
                      </a>
                    </span>
                  ))}
                </p>
              )}




              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button asChild variant="outline" size="lg" className="flex-1">
                  <a
                    href={`https://wa.me/5527999999999?text=${waMsg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="flex-1">
                  <Link to="/contato">
                    <Mail className="mr-2 h-4 w-4" /> Solicitar cotação
                  </Link>
                </Button>
              </div>


              <ul className="mt-5 grid grid-cols-1 gap-2 border-t hairline pt-4 text-sm sm:grid-cols-2">
                <li className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Compatibilidade testada com <strong>Zebra, Argox, Elgin</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Award className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Suprimentos com <strong>certificação FSC</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Envio para todo o Brasil</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>Suporte técnico especializado</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Compre junto */}
        <BundleOffersSection productId={p.id} />

        {/* Sobre o produto */}
        {commercialHtml && (
          <section aria-labelledby="sobre" className="mx-auto mt-16 max-w-3xl">
            <p className="eyebrow text-primary">Sobre o produto</p>
            <h2 id="sobre" className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              O que você precisa saber
            </h2>
            <div
              className="prose prose-neutral mt-6 max-w-none prose-headings:font-display prose-headings:tracking-tight prose-h3:text-lg prose-h3:mt-8 prose-p:leading-relaxed prose-p:text-foreground/85 prose-strong:text-foreground prose-strong:font-semibold prose-ul:my-4 prose-li:my-1"
              dangerouslySetInnerHTML={{ __html: commercialHtml }}
            />
          </section>
        )}

        {/* Ficha técnica */}
        {techHtml && (
          <section aria-labelledby="ficha" className="mx-auto mt-16 max-w-4xl">
            <p className="eyebrow text-primary">Especificações</p>
            <h2 id="ficha" className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Ficha técnica
            </h2>
            <div className="mt-6 rounded-xl border hairline bg-surface-2 p-6 md:p-8">
              <div
                className="prose prose-sm max-w-none prose-headings:font-display prose-h3:text-base prose-h3:mt-6 prose-p:my-2 prose-table:text-xs prose-th:bg-surface-3 prose-th:font-semibold prose-td:align-top"
                dangerouslySetInnerHTML={{ __html: techHtml }}
              />
            </div>
          </section>
        )}

        {/* FAQ */}
        {p.faqs.length > 0 && (
          <section aria-labelledby="faq" className="mx-auto mt-16 max-w-3xl">
            <p className="eyebrow text-primary">Dúvidas frequentes</p>
            <h2 id="faq" className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
              Perguntas frequentes sobre {p.name.split(" ").slice(0, 4).join(" ")}
            </h2>
            <Accordion type="single" collapsible className="mt-6">
              {p.faqs.map((f) => (
                <AccordionItem key={f.id} value={f.id}>
                  <AccordionTrigger className="text-left text-base font-medium">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        )}

        {/* CTA final */}
        <section className="mx-auto mt-20 max-w-3xl rounded-xl border hairline bg-gradient-to-br from-surface-2 to-card p-8 text-center shadow-card">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Precisa de volume ou cotação personalizada?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Nosso time comercial responde em minutos com prazo, frete e condições B2B.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button asChild size="lg">
              <a href={`https://wa.me/5527999999999?text=${waMsg}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp comercial
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contato">
                <Mail className="mr-2 h-4 w-4" /> Formulário de cotação
              </Link>
            </Button>
          </div>
        </section>
      </div>
    </article>
  );
}
