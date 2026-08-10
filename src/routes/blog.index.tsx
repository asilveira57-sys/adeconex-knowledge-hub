import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ArrowRight, CalendarDays, Clock, Search, X } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { BLOG_CATEGORIES, sortedPosts } from "@/content/blog-posts";
import {
  FACET_GROUPS,
  facetLabel,
  filterPosts,
  countFor,
  type BlogFilterState,
  type FacetGroupKey,
} from "@/content/blog-facets";
import { absoluteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  cat: fallback(z.string(), "Todos").default("Todos"),
  impressora: fallback(z.string(), "").default(""),
  material: fallback(z.string(), "").default(""),
  tecnologia: fallback(z.string(), "").default(""),
  ribbon: fallback(z.string(), "").default(""),
});

const EMPTY: BlogFilterState = {
  q: "",
  cat: "Todos",
  impressora: "",
  material: "",
  tecnologia: "",
  ribbon: "",
};

export const Route = createFileRoute("/blog/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Blog técnico Adeconex — ribbon, etiquetas e impressoras" },
      {
        name: "description",
        content:
          "Artigos técnicos sobre ribbon, etiquetas, compatibilidade de impressoras térmicas, economia de insumos e código de barras. Busque e filtre por impressora, material, tecnologia e tipo de ribbon.",
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

const pillClass = (active: boolean) =>
  cn(
    "rounded-full border hairline px-3.5 py-1.5 text-xs font-medium transition-colors",
    active ? "bg-primary text-primary-foreground" : "bg-card hover:bg-accent",
  );

function BlogIndex() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/blog" });

  const state: BlogFilterState = {
    q: search.q,
    cat: search.cat,
    impressora: search.impressora,
    material: search.material,
    tecnologia: search.tecnologia,
    ribbon: search.ribbon,
  };

  const patch = (next: Partial<BlogFilterState>) =>
    navigate({ search: (prev) => ({ ...prev, ...next }) });

  const posts = filterPosts(sortedPosts, state);
  const [featured, ...rest] = posts;

  const activeCount =
    (state.q ? 1 : 0) +
    (state.cat !== "Todos" ? 1 : 0) +
    FACET_GROUPS.filter((g) => state[g.key]).length;

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

          <div className="relative mt-8 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={state.q}
              onChange={(e) => patch({ q: e.target.value })}
              placeholder="Buscar artigos: ribbon resina, BOPP, Zebra, Mercado Livre…"
              aria-label="Buscar artigos do blog"
              className="w-full rounded-full border hairline bg-card py-3 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-signal"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {["Todos", ...BLOG_CATEGORIES].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => patch({ cat: c })}
                className={pillClass(state.cat === c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 border-t hairline pt-6 md:grid-cols-2 lg:grid-cols-4">
            {FACET_GROUPS.map((g) => (
              <div key={g.key}>
                <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                  {g.label}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {g.options.map((o) => {
                    const active = state[g.key] === o.value;
                    const count = countFor(sortedPosts, g.key as FacetGroupKey, o.value, {
                      ...state,
                      [g.key]: "",
                    });
                    return (
                      <button
                        key={o.value}
                        type="button"
                        disabled={count === 0 && !active}
                        onClick={() => patch({ [g.key]: active ? "" : o.value })}
                        className={cn(
                          pillClass(active),
                          count === 0 && !active && "opacity-40",
                        )}
                      >
                        {o.label}
                        <span className="ml-1.5 opacity-60">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>
              {posts.length} {posts.length === 1 ? "artigo" : "artigos"}
              {activeCount > 0 ? " com os filtros atuais" : " publicados"}
            </span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => navigate({ search: () => EMPTY })}
                className="inline-flex items-center gap-1 underline underline-offset-4 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" /> Limpar filtros
              </button>
            )}
          </div>
        </div>
      </section>

      <Section>
        {posts.length === 0 ? (
          <div className="rounded-xl border hairline bg-card p-10 text-center text-sm text-muted-foreground">
            Nenhum artigo encontrado. Tente outra busca ou remova os filtros.
          </div>
        ) : null}

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

        {rest.length > 0 && (
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
        )}
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

export { facetLabel };
