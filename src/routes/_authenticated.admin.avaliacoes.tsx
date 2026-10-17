import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AlertTriangle, BadgeCheck, Check, EyeOff, Mail, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/reviews/star-rating";
import { reviewMediaUrl } from "@/components/reviews/media-url";
import { deleteReviewMedia, listReviewsAdmin, moderateReview, runReviewEmailsNow } from "@/lib/reviews.functions";
import { REVIEW_STATUS_LABEL, formatRating } from "@/lib/reviews.shared";

export const Route = createFileRoute("/_authenticated/admin/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Avaliações — Administração Adeconex" },
      { name: "description", content: "Moderação das avaliações de produtos." },
      { property: "og:title", content: "Avaliações — Administração Adeconex" },
      { property: "og:description", content: "Moderação das avaliações de produtos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminReviews,
});

type Status = "pending" | "approved" | "rejected" | "hidden" | "all";
const FLAG_LABEL: Record<string, string> = { link: "Link", email: "E-mail", telefone: "Telefone", palavrao: "Palavrão" };

function AdminReviews() {
  const [status, setStatus] = useState<Status>("pending");
  const [q, setQ] = useState("");
  const list = useServerFn(listReviewsAdmin);
  const moderate = useServerFn(moderateReview);
  const delMedia = useServerFn(deleteReviewMedia);
  const runEmails = useServerFn(runReviewEmailsNow);
  const qc = useQueryClient();
  const key = ["admin", "reviews", status, q];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => list({ data: { status, q: q || undefined } }) });
  const [replies, setReplies] = useState<Record<string, string>>({});
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "reviews"] });

  const act = async (id: string, action: "approve" | "reject" | "hide" | "reply" | "feature" | "unfeature", extra: { reason?: string; reply?: string } = {}) => {
    try {
      await moderate({ data: { id, action, ...extra } });
      toast.success("Atualizado");
      refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  const s = data?.summary;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Avaliações de produtos</h1>
          <p className="text-sm text-muted-foreground">Aprove, responda e acompanhe as opiniões. Notas baixas não podem ser recusadas só por serem negativas.</p>
        </div>
        <Button variant="outline" onClick={async () => {
          try { const r = await runEmails(); toast.success(`${r.requests} pedidos de avaliação e ${r.reminders} lembretes enviados`); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
        }}><Mail className="mr-2 h-4 w-4" /> Enviar e-mails vencidos agora</Button>
      </div>

      {s ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Nota média geral</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">{formatRating(s.stats.average)} <Stars value={s.stats.average} /></p>
            <p className="text-xs text-muted-foreground">{s.stats.count} aprovadas</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="mt-1 text-2xl font-semibold tabular-nums">{s.pending}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Resposta aos e-mails</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{s.emailsSent ? Math.round((s.emailsCompleted / s.emailsSent) * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">{s.emailsCompleted} de {s.emailsSent} pedidos</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Produtos publicados sem avaliação</p><p className="mt-1 text-2xl font-semibold tabular-nums">{s.productsWithoutReviews}</p></CardContent></Card>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "hidden", "all"] as Status[]).map((k) => (
          <Button key={k} size="sm" variant={status === k ? "default" : "outline"} onClick={() => setStatus(k)}>
            {k === "all" ? "Todas" : REVIEW_STATUS_LABEL[k]}
          </Button>
        ))}
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no texto…" className="ml-auto h-9 w-56" />
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
      {data && !data.rows.length ? <p className="rounded-lg border hairline p-8 text-center text-sm text-muted-foreground">Nenhuma avaliação aqui.</p> : null}

      <div className="space-y-4">
        {data?.rows.map((r) => {
          const prod = (r as unknown as { products: { name: string; slug: string } | null }).products;
          const media = (r as unknown as { product_review_media: { id: string; kind: string; storage_path: string }[] }).product_review_media ?? [];
          const rating = Number(r.rating);
          return (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={rating} /> <strong className="tabular-nums">{formatRating(rating)}</strong>
                  <Badge variant={r.status === "approved" ? "default" : "secondary"}>{REVIEW_STATUS_LABEL[r.status]}</Badge>
                  {r.verified_purchase ? <Badge variant="outline" className="gap-1"><BadgeCheck className="h-3 w-3" /> Compra verificada</Badge> : null}
                  {r.featured ? <Badge variant="outline" className="gap-1"><Star className="h-3 w-3" /> Destaque</Badge> : null}
                  {rating <= 2 ? <Badge variant="destructive">Nota baixa</Badge> : null}
                  {r.moderation_flags.map((f) => <Badge key={f} variant="destructive" className="gap-1"><AlertTriangle className="h-3 w-3" /> {FLAG_LABEL[f] ?? f}</Badge>)}
                  <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                </div>
                {prod ? <Link to="/produto/$slug" params={{ slug: prod.slug }} target="_blank" className="text-sm font-medium text-primary hover:underline">{prod.name}</Link> : null}
                <p className="text-xs text-muted-foreground">{r.display_name}{r.city ? ` · ${r.city}` : ""} · {r.helpful_count} acharam útil</p>
                {r.title ? <p className="font-medium">{r.title}</p> : null}
                <p className="whitespace-pre-line text-sm">{r.body}</p>
                {media.length ? (
                  <div className="flex flex-wrap gap-2">
                    {media.map((m) => (
                      <div key={m.id} className="relative h-24 w-24 overflow-hidden rounded-md border hairline">
                        {m.kind === "image" ? <a href={reviewMediaUrl(m.storage_path)} target="_blank" rel="noreferrer"><img src={reviewMediaUrl(m.storage_path)} alt="" className="h-full w-full object-cover" /></a>
                          : <video src={reviewMediaUrl(m.storage_path)} controls className="h-full w-full object-cover" />}
                        <button type="button" aria-label="Remover mídia" className="absolute right-1 top-1 rounded bg-background/90 p-1"
                          onClick={async () => { if (!confirm("Remover esta mídia?")) return; await delMedia({ data: { mediaId: m.id } }); refresh(); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
                {r.rejection_reason ? <p className="text-xs text-destructive">Motivo da recusa: {r.rejection_reason}</p> : null}
                <div className="space-y-2">
                  <Textarea rows={2} placeholder="Resposta pública da Adeconex…" value={replies[r.id] ?? r.admin_reply ?? ""} onChange={(e) => setReplies((x) => ({ ...x, [r.id]: e.target.value }))} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status !== "approved" ? <Button size="sm" onClick={() => act(r.id, "approve")}><Check className="mr-1 h-4 w-4" /> Aprovar</Button> : null}
                  {r.status !== "rejected" ? <Button size="sm" variant="outline" onClick={() => {
                    const reason = prompt("Motivo da recusa (ofensivo, fora do tema, dados pessoais…)");
                    if (reason) act(r.id, "reject", { reason });
                  }}><X className="mr-1 h-4 w-4" /> Recusar</Button> : null}
                  {r.status !== "hidden" ? <Button size="sm" variant="outline" onClick={() => act(r.id, "hide")}><EyeOff className="mr-1 h-4 w-4" /> Ocultar</Button> : null}
                  <Button size="sm" variant="outline" onClick={() => act(r.id, "reply", { reply: replies[r.id] ?? r.admin_reply ?? "" })}>Salvar resposta</Button>
                  <Button size="sm" variant="ghost" onClick={() => act(r.id, r.featured ? "unfeature" : "feature")}>{r.featured ? "Tirar destaque" : "Destacar"}</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
