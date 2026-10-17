import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, MessageSquareReply, Play, ThumbsUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useSession } from "@/hooks/use-session";
import { getProductReviews, voteReviewHelpful, type ProductReviewsData, type PublicReview } from "@/lib/reviews.functions";
import { formatRating } from "@/lib/reviews.shared";
import { Stars } from "./star-rating";
import { ReviewForm } from "./review-form";
import { ShareButtons } from "./share-buttons";
import { reviewMediaUrl } from "./media-url";

type Sort = "recentes" | "uteis" | "maior" | "menor";
type Filter = "todas" | "midia" | "verificadas" | "5" | "4" | "3" | "2" | "1";

export const productReviewsOptions = (productId: string, sort: Sort = "recentes", filter: Filter = "todas", page = 1) =>
  queryOptions({
    queryKey: ["public", "reviews", productId, sort, filter, page],
    queryFn: () => getProductReviews({ data: { productId, sort, filter, page, pageSize: 10 } }),
    staleTime: 60_000,
  });

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });

function voterKey(): string {
  const k = "adx_voter";
  let v = localStorage.getItem(k);
  if (!v) { v = `v-${crypto.randomUUID()}`; localStorage.setItem(k, v); }
  return v;
}

/** Resumo compacto para o topo da página (perto do preço). */
export function ReviewSummaryInline({ data }: { data: ProductReviewsData }) {
  const { average, count } = data.stats;
  const go = () => document.getElementById("avaliacoes")?.scrollIntoView({ behavior: "smooth" });
  if (!count) {
    return (
      <button type="button" onClick={go} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <Stars value={0} /> Seja o primeiro a avaliar
      </button>
    );
  }
  return (
    <button type="button" onClick={go} className="inline-flex items-center gap-2 text-sm hover:underline">
      <Stars value={average} /> <strong className="tabular-nums">{formatRating(average)}</strong>
      <span className="text-muted-foreground">({count} {count === 1 ? "avaliação" : "avaliações"})</span>
    </button>
  );
}

function MediaThumb({ m, onOpen }: { m: { kind: "image" | "video"; path: string }; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border hairline bg-surface-2">
      {m.kind === "image"
        ? <img src={reviewMediaUrl(m.path)} alt="Foto enviada por cliente" loading="lazy" className="h-full w-full object-cover" />
        : <><video src={reviewMediaUrl(m.path)} preload="metadata" muted className="h-full w-full object-cover" /><Play className="absolute inset-0 m-auto h-6 w-6 text-background drop-shadow" /></>}
    </button>
  );
}

function ReviewItem({ r, onOpenMedia, shareUrl }: { r: PublicReview; onOpenMedia: (m: { kind: "image" | "video"; path: string }) => void; shareUrl: string }) {
  const vote = useServerFn(voteReviewHelpful);
  const [helpful, setHelpful] = useState(r.helpful_count);
  const [voted, setVoted] = useState(false);
  return (
    <article id={`avaliacao-${r.id}`} className="border-b hairline py-6 last:border-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stars value={r.rating} />
        <span className="text-sm font-semibold tabular-nums">{formatRating(r.rating)}</span>
        {r.title ? <h3 className="font-medium">{r.title}</h3> : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{r.display_name}</span>
        {r.city ? ` · ${r.city}` : ""} · <time dateTime={r.created_at}>{dateFmt(r.created_at)}</time>
        {r.verified_purchase ? <span className="ml-2 inline-flex items-center gap-1 text-primary"><BadgeCheck className="h-3.5 w-3.5" /> Compra verificada</span> : null}
      </p>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{r.body}</p>
      {r.media.length ? (
        <div className="mt-3 flex flex-wrap gap-2">{r.media.map((m) => <MediaThumb key={m.id} m={m} onOpen={() => onOpenMedia(m)} />)}</div>
      ) : null}
      {r.admin_reply ? (
        <div className="mt-4 rounded-lg border-l-2 border-primary bg-surface-2 p-3 text-sm">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold"><MessageSquareReply className="h-3.5 w-3.5" /> Resposta da Adeconex</p>
          <p className="whitespace-pre-line text-muted-foreground">{r.admin_reply}</p>
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" disabled={voted} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-60"
          onClick={async () => {
            setVoted(true);
            const res = await vote({ data: { reviewId: r.id, voterKey: voterKey() } }).catch(() => null);
            if (res?.ok) setHelpful(res.count);
          }}>
          <ThumbsUp className="h-3.5 w-3.5" /> Foi útil? ({helpful})
        </button>
        <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => navigator.clipboard?.writeText(`${shareUrl}#avaliacao-${r.id}`)}>
          Copiar link da avaliação
        </button>
      </div>
    </article>
  );
}

export function ProductReviewsSection({ productId, productName, productSlug, shareUrl, initial }: {
  productId: string; productName: string; productSlug: string; shareUrl: string; initial: ProductReviewsData;
}) {
  const [sort, setSort] = useState<Sort>("recentes");
  const [filter, setFilter] = useState<Filter>("todas");
  const [page, setPage] = useState(1);
  const [writing, setWriting] = useState(false);
  const [sent, setSent] = useState(false);
  const [lightbox, setLightbox] = useState<{ kind: "image" | "video"; path: string } | null>(null);
  const { user, ready } = useSession();
  const isDefault = sort === "recentes" && filter === "todas" && page === 1;
  const { data = initial } = useQuery({
    ...productReviewsOptions(productId, sort, filter, page),
    initialData: isDefault ? initial : undefined,
    placeholderData: keepPreviousData,
  });
  const { stats } = initial;
  const pages = Math.max(1, Math.ceil(data.total / 10));

  const filters: { key: Filter; label: string }[] = [
    { key: "todas", label: "Todas" },
    { key: "midia", label: "Com foto/vídeo" },
    { key: "verificadas", label: "Compra verificada" },
    ...([5, 4, 3, 2, 1] as const).map((n) => ({ key: String(n) as Filter, label: `${n} ★` })),
  ];

  return (
    <section id="avaliacoes" aria-labelledby="avaliacoes-titulo" className="mx-auto mt-16 max-w-4xl scroll-mt-24">
      <p className="eyebrow text-primary">Opiniões de clientes</p>
      <h2 id="avaliacoes-titulo" className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
        Avaliações de {productName.split(" ").slice(0, 5).join(" ")}
      </h2>

      <div className="mt-6 grid gap-8 rounded-xl border hairline bg-surface-2 p-6 md:grid-cols-[220px_1fr] md:p-8">
        <div className="text-center md:text-left">
          <p className="font-display text-5xl font-semibold tabular-nums">{formatRating(stats.average)}</p>
          <Stars value={stats.average} size={22} className="mt-2" />
          <p className="mt-1 text-sm text-muted-foreground">{stats.count ? `${stats.count} ${stats.count === 1 ? "avaliação" : "avaliações"}` : "Ainda sem avaliações"}</p>
        </div>
        <div className="space-y-1.5">
          {([5, 4, 3, 2, 1] as const).map((n) => {
            const c = stats.distribution[n];
            const pct = stats.count ? Math.round((c / stats.count) * 100) : 0;
            return (
              <button key={n} type="button" onClick={() => { setFilter(String(n) as Filter); setPage(1); }}
                className="flex w-full items-center gap-3 text-sm hover:text-foreground">
                <span className="w-10 text-left tabular-nums text-muted-foreground">{n} ★</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                  <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: "var(--star)" }} />
                </span>
                <span className="w-10 text-right tabular-nums text-muted-foreground">{c}</span>
              </button>
            );
          })}
        </div>
      </div>

      {stats.count > 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {productName} tem nota {formatRating(stats.average)} de 5 com base em {stats.count} {stats.count === 1 ? "avaliação" : "avaliações"} de clientes da Adeconex.
          {initial.highlights ? <> Clientes destacam: <strong className="text-foreground">{initial.highlights}</strong>.</> : null}
        </p>
      ) : null}

      {initial.mediaGallery.length ? (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Fotos e vídeos de clientes</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {initial.mediaGallery.map((m) => <MediaThumb key={m.id} m={m} onOpen={() => setLightbox(m)} />)}
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ShareButtons url={shareUrl} title={productName} />
        {!writing && !sent ? (
          ready && user ? (
            <Button onClick={() => setWriting(true)}>Escrever avaliação</Button>
          ) : (
            <Button asChild>
              <Link to="/auth" search={{ redirect: `/produto/${productSlug}#avaliacoes` } as never}>Entrar para avaliar</Link>
            </Button>
          )
        ) : null}
      </div>

      {writing && user ? (
        <div className="mt-6 rounded-xl border hairline p-6">
          <ReviewForm productId={productId} productName={productName} onDone={() => { setWriting(false); setSent(true); }} />
        </div>
      ) : null}
      {sent ? <p className="mt-4 rounded-lg bg-accent p-4 text-sm">Obrigado! Sua avaliação foi recebida e aparece aqui depois de revisada pela nossa equipe.</p> : null}

      {stats.count > 0 ? (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {filters.map((f) => (
              <Button key={f.key} size="sm" variant={filter === f.key ? "default" : "outline"} onClick={() => { setFilter(f.key); setPage(1); }}>{f.label}</Button>
            ))}
            <select aria-label="Ordenar avaliações" value={sort} onChange={(e) => { setSort(e.target.value as Sort); setPage(1); }}
              className="ml-auto h-9 rounded-md border bg-background px-2 text-sm">
              <option value="recentes">Mais recentes</option>
              <option value="uteis">Mais úteis</option>
              <option value="maior">Maior nota</option>
              <option value="menor">Menor nota</option>
            </select>
          </div>
          <div className="mt-2">
            {data.reviews.length ? data.reviews.map((r) => <ReviewItem key={r.id} r={r} onOpenMedia={setLightbox} shareUrl={shareUrl} />)
              : <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma avaliação com esse filtro.</p>}
          </div>
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
              <span className="tabular-nums text-muted-foreground">{page} de {pages}</span>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Próxima</Button>
            </div>
          ) : null}
        </>
      ) : null}

      <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2">
          <DialogTitle className="sr-only">Mídia da avaliação</DialogTitle>
          <button type="button" className="sr-only" onClick={() => setLightbox(null)}><X /></button>
          {lightbox?.kind === "image" ? <img src={reviewMediaUrl(lightbox.path)} alt="Foto enviada por cliente" className="max-h-[80vh] w-full object-contain" /> : null}
          {lightbox?.kind === "video" ? <video src={reviewMediaUrl(lightbox.path)} controls autoPlay className="max-h-[80vh] w-full" /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
