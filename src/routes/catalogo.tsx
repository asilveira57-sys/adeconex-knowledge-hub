import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { ProductCarousel } from "@/components/product-carousel";
import { Section, SectionHeader } from "@/components/ui/section";

export const Route = createFileRoute("/catalogo")({
  head: () => ({
    meta: [
      { title: "Catálogo técnico — Adeconex" },
      { name: "description", content: "Etiquetas couchê, BOPP, ribbons e mais. Cada produto com ficha técnica, compatibilidade e vídeos." },
      { property: "og:title", content: "Catálogo técnico — Adeconex" },
      { property: "og:description", content: "Vitrines por família: couchê, BOPP, ribbons e etiquetas especiais." },
      { property: "og:url", content: "/catalogo" },
    ],
    links: [{ rel: "canonical", href: "/catalogo" }],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  return (
    <>
      <Section>
        <SectionHeader
          eyebrow="Catálogo"
          title="Vitrines por família de produto"
          description="Selecionamos os destaques de cada linha. Clique em um produto para ver ficha técnica, compatibilidade, aplicações e canais de compra."
        />
      </Section>
      <Suspense fallback={<div className="container-page py-12 text-sm text-muted-foreground">Carregando vitrines…</div>}>
        <ProductCarousel
          eyebrow="Papel branco"
          title="Etiquetas Couchê"
          description="Papel calandrado brilhante, ideal para código de barras, preço e identificação geral."
          categorySlug="etiqueta-couche"
        />
        <ProductCarousel
          eyebrow="Alta resistência"
          title="Etiquetas BOPP"
          description="Polipropileno branco, resistente à água, gordura e rasgo — perfeito para alimentos e validade."
          categorySlug="etiqueta-bopp"
        />
        <ProductCarousel
          eyebrow="Impressão térmica"
          title="Ribbons"
          description="Cera, cera-resina e resina para as principais impressoras do mercado."
          categorySlug="ribbon-cera"
        />
        <ProductCarousel
          eyebrow="Impressão direta"
          title="Etiquetas Térmicas"
          description="Sem necessidade de ribbon — ideais para balança, delivery e etiquetagem de curta duração."
          categorySlug="etiqueta-termica"
        />
        <ProductCarousel
          eyebrow="Preço"
          title="Etiquetas de Preço"
          description="Para gôndola, PDV e reposição rápida em varejo."
          categorySlug="etiqueta-de-preco"
        />
      </Suspense>
    </>
  );
}
