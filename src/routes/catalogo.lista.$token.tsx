import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { FileDown, ImageOff, Loader2, MessageCircle } from "lucide-react";
import { getCatalogList } from "@/lib/catalog-leads.functions";
import { catalogListUrl, describeSearch } from "@/lib/catalog-leads.shared";
import { buildCatalogListPdf, downloadBlob } from "@/lib/catalog-list-pdf";
import { Section } from "@/components/ui/section";
import { Button } from "@/components/ui/button";
import adeconexLogo from "@/assets/brand/logo-adeconex-oficial.png";

const listQuery = (token: string) =>
  queryOptions({ queryKey: ["catalog-list", token], queryFn: () => getCatalogList({ data: { token } }), staleTime: 60_000 });

export const Route = createFileRoute("/catalogo/lista/$token")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(listQuery(params.token));
    if (!d) throw notFound();
  },
  head: () => ({
    meta: [
      { title: "Lista salva do catálogo — Adeconex" },
      { name: "description", content: "Produtos salvos de uma pesquisa no catálogo Adeconex, com preços atualizados e PDF." },
      { property: "og:title", content: "Lista salva do catálogo — Adeconex" },
      { property: "og:description", content: "Produtos salvos de uma pesquisa no catálogo Adeconex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  notFoundComponent: () => (
    <Section><p className="py-20 text-center">Lista não encontrada. <Link to="/catalogo" className="underline">Abrir catálogo</Link></p></Section>
  ),
  component: ListPage,
});

const money = (v: number | null) => (v === null ? "Sob consulta" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));

function ListPage() {
  const { token } = Route.useParams();
  const { data } = useSuspenseQuery(listQuery(token));
  const [pdf, setPdf] = useState<Blob | null>(null);
  const filters = describeSearch(data?.searchParams ?? {});

  useEffect(() => {
    if (!data) return;
    buildCatalogListPdf({ products: data.products, filters, logoUrl: adeconexLogo, listUrl: catalogListUrl(window.location.origin, token) })
      .then(setPdf).catch(() => setPdf(null));
  }, [data, filters, token]);

  if (!data) return null;
  const wa = `https://wa.me/5527992733033?text=${encodeURIComponent(`Olá! Quero um orçamento da minha lista do catálogo: ${typeof window !== "undefined" ? window.location.href : ""}`)}`;

  return (
    <Section>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Lista salva do catálogo</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filters} · {data.products.length} produtos · preços atualizados</p>
        </div>
        <div className="flex gap-2">
          <Button disabled={!pdf} onClick={() => pdf && downloadBlob(pdf, "lista-catalogo-adeconex.pdf")} className="gap-2">
            {pdf ? <FileDown className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />} Baixar PDF
          </Button>
          <Button variant="outline" asChild className="gap-2"><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Falar com vendas</a></Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {data.products.map((p) => {
          const promo = p.promotional_price && p.price && p.promotional_price < p.price;
          return (
            <Link key={p.id} to="/produto/$slug" params={{ slug: p.slug }} className="rounded-lg border border-border bg-card p-3 hover:border-signal">
              <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded bg-surface-2">
                {p.image_url ? <img src={p.image_url} alt={p.image_alt ?? p.name} loading="lazy" className="h-full w-full object-contain" /> : <ImageOff className="h-8 w-8 text-muted-foreground" />}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="mt-1 font-semibold text-signal">{money(promo ? p.promotional_price : p.price)}</p>
            </Link>
          );
        })}
      </div>
      {data.products.length === 0 && <p className="text-muted-foreground">Os produtos desta lista não estão mais disponíveis.</p>}
    </Section>
  );
}
