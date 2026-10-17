import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getReviewRequest } from "@/lib/reviews.functions";
import { ReviewForm } from "@/components/reviews/review-form";
import { Stars } from "@/components/reviews/star-rating";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/avaliar/$token")({
  validateSearch: z.object({ produto: z.string().optional(), nota: z.coerce.number().optional() }),
  head: () => ({
    meta: [
      { title: "Avalie sua compra — Adeconex" },
      { name: "description", content: "Conte como foi sua experiência com os produtos Adeconex." },
      { property: "og:title", content: "Avalie sua compra — Adeconex" },
      { property: "og:description", content: "Conte como foi sua experiência com os produtos Adeconex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ReviewByTokenPage,
});

type Req = Awaited<ReturnType<typeof getReviewRequest>>;

function ReviewByTokenPage() {
  const { token } = Route.useParams();
  const { produto, nota } = Route.useSearch();
  const load = useServerFn(getReviewRequest);
  const [req, setReq] = useState<Req | null>(null);
  const [active, setActive] = useState<string | null>(produto ?? null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    load({ data: { token } }).then((r) => {
      setReq(r);
      if (r.ok) {
        if (nota) trackEvent("review_email_star_click", { rating: nota, product_id: produto });
        if (!produto) setActive(r.products.find((p) => p.reviewed == null)?.id ?? null);
      }
    }).catch(() => setReq({ ok: false, error: "Não foi possível abrir o link." }));
  }, [token, load, nota, produto]);

  if (!req) return <div className="container-page flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!req.ok) {
    return (
      <div className="container-page max-w-xl py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Não foi possível abrir</h1>
        <p className="mt-3 text-muted-foreground">{req.error}</p>
        <Button asChild className="mt-6"><Link to="/auth" search={{ redirect: "/conta" } as never}>Entrar na minha conta</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-page max-w-3xl py-12">
      <p className="eyebrow text-primary">Pedido {req.orderNumber}</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Como foi sua experiência?</h1>
      <p className="mt-2 text-muted-foreground">Avalie cada produto. Leva menos de 1 minuto e ajuda outros clientes.</p>
      <div className="mt-8 space-y-4">
        {req.products.map((p) => {
          const reviewed = done[p.id] || p.reviewed != null;
          const open = active === p.id;
          return (
            <div key={p.id} className="rounded-xl border hairline p-5">
              <div className="flex items-center gap-4">
                {p.image ? <img src={p.image} alt="" className="h-14 w-14 rounded-md object-contain" /> : null}
                <div className="flex-1">
                  <p className="font-medium">{p.name}</p>
                  {reviewed ? <p className="mt-1 inline-flex items-center gap-1 text-sm text-primary"><CheckCircle2 className="h-4 w-4" /> Avaliação enviada</p>
                    : p.reviewed != null ? <Stars value={p.reviewed} /> : null}
                </div>
                {!open ? <Button variant={reviewed ? "outline" : "default"} size="sm" onClick={() => setActive(p.id)}>{reviewed ? "Editar" : "Avaliar"}</Button> : null}
              </div>
              {open ? (
                <div className="mt-5 border-t hairline pt-5">
                  <ReviewForm productId={p.id} productName={p.name} token={token}
                    initialRating={p.id === produto ? nota : undefined}
                    onDone={() => {
                      setDone((d) => ({ ...d, [p.id]: true }));
                      setActive(req.products.find((x) => x.id !== p.id && !done[x.id] && x.reviewed == null)?.id ?? null);
                    }} />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Gostou do atendimento? <a className="underline" href="https://search.google.com/local/writereview?placeid=ChIJRZiVPxAeuAARhE6fc6lFr_Y" target="_blank" rel="noopener noreferrer">Avalie a Adeconex no Google</a>.
      </p>
    </div>
  );
}
