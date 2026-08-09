import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Clock } from "lucide-react";
import { Section } from "@/components/ui/section";
import { blogPosts, getPost, type BlogBlock } from "@/content/blog-posts";
import { absoluteUrl } from "@/lib/seo";

const fmtDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export const Route = createFileRoute("/blog/$slug")({
  loader: ({ params }) => {
    const post = getPost(params.slug);
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const url = absoluteUrl(`/blog/${loaderData.slug}`);
    return {
      meta: [
        { title: loaderData.seoTitle },
        { name: "description", content: loaderData.description },
        { name: "keywords", content: loaderData.keywords.join(", ") },
        { property: "og:title", content: loaderData.title },
        { property: "og:description", content: loaderData.description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: BlogPostPage,
});

function Block({ block }: { block: BlogBlock }) {
  switch (block.type) {
    case "h2":
      return (
        <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight">
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3 className="mt-8 font-display text-lg font-semibold tracking-tight">
          {block.text}
        </h3>
      );
    case "p":
      return <p className="mt-4 leading-relaxed text-muted-foreground">{block.text}</p>;
    case "ul":
      return (
        <ul className="mt-4 space-y-2">
          {block.items.map((i) => (
            <li key={i} className="flex gap-3 text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol className="mt-4 space-y-2">
          {block.items.map((i, idx) => (
            <li key={i} className="flex gap-3 text-muted-foreground">
              <span className="font-mono text-xs text-primary">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span>{i}</span>
            </li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote className="mt-6 border-l-2 border-primary pl-5 text-lg font-medium">
          {block.text}
        </blockquote>
      );
    case "table":
      return (
        <div className="mt-6 overflow-x-auto rounded-xl border hairline">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                {block.head.map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join("|")} className="border-t hairline">
                  {row.map((cell) => (
                    <td key={cell} className="px-4 py-3 text-muted-foreground">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function BlogPostPage() {
  const post = Route.useLoaderData();
  const related = (post.related ?? [])
    .map((s) => blogPosts.find((p) => p.slug === s))
    .filter((p): p is (typeof blogPosts)[number] => Boolean(p));

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.date,
      inLanguage: "pt-BR",
      mainEntityOfPage: absoluteUrl(`/blog/${post.slug}`),
      author: { "@type": "Organization", name: "Adeconex" },
      publisher: { "@type": "Organization", name: "Adeconex" },
      articleSection: post.category,
      keywords: post.keywords.join(", "),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Blog", item: absoluteUrl("/blog") },
        {
          "@type": "ListItem",
          position: 3,
          name: post.title,
          item: absoluteUrl(`/blog/${post.slug}`),
        },
      ],
    },
    ...(post.faq?.length
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
        ]
      : []),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-14 md:py-16">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Blog
          </Link>
          <p className="eyebrow mt-6">{post.category}</p>
          <h1 className="mt-3 max-w-4xl font-display text-3xl font-semibold tracking-tight md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground md:text-lg">
            {post.excerpt}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(post.date)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {post.readingMinutes} min de leitura
            </span>
          </div>
        </div>
      </section>

      <Section>
        <article className="max-w-3xl">
          {post.blocks.map((b, i) => (
            <Block key={`${b.type}-${i}`} block={b} />
          ))}

          {post.faq?.length ? (
            <>
              <h2 className="mt-12 font-display text-2xl font-semibold tracking-tight">
                Perguntas frequentes
              </h2>
              <div className="mt-4 divide-y hairline overflow-hidden rounded-xl border hairline">
                {post.faq.map((f) => (
                  <div key={f.q} className="bg-card p-5">
                    <p className="font-medium">{f.q}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <div className="mt-12 rounded-2xl ink-surface p-8">
            <p className="eyebrow text-white/70">Fale com um especialista</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
              Precisa validar material, ribbon ou compatibilidade?
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/contato"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-ink"
              >
                Solicitar orçamento <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/catalogo"
                className="inline-flex items-center gap-2 rounded-md border border-white/25 px-5 py-3 text-sm font-medium text-white"
              >
                Ver catálogo
              </Link>
            </div>
          </div>
        </article>

        {related.length ? (
          <div className="mt-14">
            <p className="eyebrow">Leia também</p>
            <div className="mt-4 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-2">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to="/blog/$slug"
                  params={{ slug: r.slug }}
                  className="bg-card p-6 transition-colors hover:bg-accent/40"
                >
                  <p className="eyebrow">{r.category}</p>
                  <p className="mt-2 font-medium">{r.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{r.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </Section>
    </>
  );
}
