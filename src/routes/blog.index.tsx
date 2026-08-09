import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";
import { useState } from "react";
import { Section, SectionHeader } from "@/components/ui/section";
import { BLOG_CATEGORIES, sortedPosts } from "@/content/blog-posts";
import { absoluteUrl } from "@/lib/seo";

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog técnico Adeconex — ribbon, etiquetas e impressoras" },
      {
        name: "description",
        content:
          "Artigos técnicos sobre ribbon, etiquetas, compatibilidade de impressoras térmicas, economia de insumos e código de barras.",
      },
      { property: "og:title", content: "Blog técnico Adeconex" },
      {
        property: "og:description",
        content:
          "Guias práticos sobre impressão térmica: ribbon, materiais de etiqueta, impressoras e redução de custo.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/blog") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/blog") }],
  }),
  component: BlogIndex,
});

function BlogIndex() {
  const [cat, setCat] = useState<string>("Todos");
  const posts =
    cat === "Todos" ? sortedPosts : sortedPosts.filter((p) => p.category === cat);
  const [featured, ...rest] = posts;

  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-16 md:py-20">
          <div className="max-w-3xl">
            <p className="eyebrow">Blog</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Conteúdo técnico sobre impressão térmica e identificação
            </h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Ribbon, materiais de etiqueta, compatibilidade de impressoras,
              código de barras e redução de custo por etiqueta — escrito pela
              equipe técnica da Adeconex.
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {["Todos", ...BLOG_CATEGORIES].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`rounded-full border hairline px-4 py-1.5 text-sm font-medium transition-colors ${
                  cat === c
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <Section>
        {featured ? (
          <Link
            to="/blog/$slug"
            params={{ slug: featured.slug }}
            className="group block rounded-2xl border hairline bg-card p-8 transition-colors hover:bg-accent/40 md:p-10"
          >
            <p className="eyebrow">{featured.category} · Destaque</p>
            <h2 className="mt-3 max-w-3xl font-display text-2xl font-semibold tracking-tight md:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              {featured.excerpt}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(featured.date)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> {featured.readingMinutes} min
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                Ler artigo{" "}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </Link>
        ) : null}

        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="group flex flex-col bg-card p-6 transition-colors hover:bg-accent/40"
            >
              <p className="eyebrow">{p.category}</p>
              <h3 className="mt-2 font-display text-lg font-semibold leading-snug tracking-tight">
                {p.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {p.excerpt}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span>{fmtDate(p.date)}</span>
                <span aria-hidden>·</span>
                <span>{p.readingMinutes} min de leitura</span>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section className="border-t hairline bg-surface-2">
        <SectionHeader
          eyebrow="Precisa de ajuda técnica?"
          title="Nossa equipe valida material, ribbon e compatibilidade antes do pedido"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Solicitar orçamento <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium"
          >
            Ver catálogo
          </Link>
        </div>
      </Section>
    </>
  );
}
