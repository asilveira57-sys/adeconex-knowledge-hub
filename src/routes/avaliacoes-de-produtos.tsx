import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { BadgeCheck } from "lucide-react";
import { getRecentReviews } from "@/lib/reviews.functions";
import { formatRating } from "@/lib/reviews.shared";
import { Stars } from "@/components/reviews/star-rating";
import { absoluteUrl } from "@/lib/seo";

const recentOptions = queryOptions({
  queryKey: ["public", "recent-reviews"],
  queryFn: () => getRecentReviews({ data: { limit: 60 } }),
  staleTime: 5 * 60_000,
});

const TITLE = "Avaliações de produtos Adeconex — opiniões de clientes";
const DESC = "Leia avaliações reais de clientes sobre etiquetas, ribbons e suprimentos de identificação da Adeconex, com nota média e compras verificadas.";

export const Route = createFileRoute("/avaliacoes-de-produtos")({
  loader: ({ context }) => context.queryClient.ensureQueryData(recentOptions),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: absoluteUrl("/avaliacoes-de-produtos") },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: absoluteUrl("/avaliacoes-de-produtos") }],
  }),
  component: RecentReviewsPage,
});

function RecentReviewsPage() {
  const { data } = useSuspenseQuery(recentOptions);
  const { stats } = data;
  return (
    <div className="container-page max-w-4xl py-12">
      <p className="eyebrow text-primary">Opiniões de clientes</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">Avaliações de produtos</h1>
      <p className="mt-3 text-muted-foreground">
        {stats.count
          ? <>Os produtos da Adeconex têm nota média {formatRating(stats.average)} de 5, com base em {stats.count} avaliações de clientes. Toda avaliação passa por revisão, e as notas baixas também são publicadas.</>
          : <>Ainda não há avaliações publicadas. Assim que os clientes avaliarem suas compras, elas aparecem aqui.</>}
      </p>
      {stats.count ? <div className="mt-4 flex items-center gap-2"><Stars value={stats.average} size={22} /><strong className="tabular-nums">{formatRating(stats.average)}</strong></div> : null}
      <div className="mt-10 divide-y hairline">
        {data.reviews.map((r) => (
          <article key={r.id} className="py-6">
            <Link to="/produto/$slug" params={{ slug: r.product.slug }} hash={`avaliacao-${r.id}`} className="text-sm font-medium text-primary hover:underline">
              {r.product.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Stars value={r.rating} /> <span className="text-sm font-semibold tabular-nums">{formatRating(r.rating)}</span>
              {r.title ? <h2 className="font-medium">{r.title}</h2> : null}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {r.display_name}{r.city ? ` · ${r.city}` : ""} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
              {r.verified_purchase ? <span className="ml-2 inline-flex items-center gap-1 text-primary"><BadgeCheck className="h-3.5 w-3.5" /> Compra verificada</span> : null}
            </p>
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed">{r.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
