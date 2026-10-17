import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { BadgeCheck, ExternalLink, History } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getQuestionHistory, listQuestionsAdmin, moderateQuestion } from "@/lib/questions.functions";
import { CONTENT_TYPE_LABEL, QUESTION_STATUS_LABEL, type QuestionStatus } from "@/lib/questions.shared";

export const Route = createFileRoute("/_authenticated/admin/perguntas")({
  head: () => ({ meta: [{ title: "Perguntas e respostas — Admin Adeconex" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminQuestions,
});

type Tab = QuestionStatus | "all";
type TypeF = "all" | "product" | "download" | "tool";
const dt = (d: string | null) => (d ? new Date(d).toLocaleString("pt-BR") : "—");

function AdminQuestions() {
  const [tab, setTab] = useState<Tab>("pending");
  const [type, setType] = useState<TypeF>("all");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const list = useServerFn(listQuestionsAdmin);
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "questions", tab, type, q, from, to],
    queryFn: () => list({ data: { status: tab, type, q: q || undefined, from: from || undefined, to: to || undefined } }),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "questions"] });
  const c = data?.counts ?? {};
  const all = (c.pending ?? 0) + (c.answered ?? 0) + (c.published ?? 0) + (c.cancelled ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Perguntas e respostas</h1>
        <p className="text-sm text-muted-foreground">Responda e publique dúvidas de clientes sobre produtos, downloads e ferramentas. Nada é publicado automaticamente.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["pending", "answered", "published", "cancelled"] as const).map((s) => (
          <Card key={s}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{QUESTION_STATUS_LABEL[s]}s</p><p className="mt-1 text-2xl font-semibold tabular-nums">{c[s] ?? 0}</p></CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pending", "answered", "published", "cancelled", "all"] as Tab[]).map((k) => (
          <Button key={k} size="sm" variant={tab === k ? "default" : "outline"} onClick={() => setTab(k)}>
            {k === "all" ? `Todas (${all})` : `${QUESTION_STATUS_LABEL[k]}s (${c[k] ?? 0})`}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as TypeF)} className="h-9 rounded-md border bg-background px-2 text-sm" aria-label="Tipo de conteúdo">
          <option value="all">Todos os conteúdos</option>
          <option value="product">Produtos</option>
          <option value="download">Downloads</option>
          <option value="tool">Ferramentas</option>
        </select>
        <label className="text-xs text-muted-foreground">De <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="inline-block h-9 w-40" /></label>
        <label className="text-xs text-muted-foreground">Até <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="inline-block h-9 w-40" /></label>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no texto…" className="ml-auto h-9 w-56" />
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
      {error ? <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro"}</p> : null}
      {data && !data.rows.length ? <p className="rounded-lg border hairline p-8 text-center text-sm text-muted-foreground">Nenhuma pergunta aqui.</p> : null}
      <div className="space-y-4">
        {data?.rows.map((r) => <QuestionCard key={r.id} r={r} onChange={refresh} />)}
      </div>
    </div>
  );
}

type Row = Awaited<ReturnType<typeof listQuestionsAdmin>>["rows"][number];

function QuestionCard({ r, onChange }: { r: Row; onChange: () => void }) {
  const moderate = useServerFn(moderateQuestion);
  const hist = useServerFn(getQuestionHistory);
  const [answer, setAnswer] = useState(r.answer ?? "");
  const [reason, setReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [confirmPub, setConfirmPub] = useState(false);
  const [showHist, setShowHist] = useState(false);
  const { data: events } = useQuery({ queryKey: ["admin", "questions", "hist", r.id], queryFn: () => hist({ data: { id: r.id } }), enabled: showHist });

  const act = async (action: "save_draft" | "publish" | "unpublish" | "cancel" | "reopen", extra: { confirm?: boolean } = {}) => {
    try {
      await moderate({ data: { id: r.id, action, answer, reason, ...extra } });
      toast.success({ save_draft: "Rascunho salvo", publish: "Publicada", unpublish: "Despublicada", cancel: "Cancelada", reopen: "Reaberta" }[action]);
      setShowCancel(false); onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro"); }
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant={r.status === "published" ? "default" : r.status === "cancelled" ? "destructive" : "secondary"}>{QUESTION_STATUS_LABEL[r.status]}</Badge>
          <Badge variant="outline">{CONTENT_TYPE_LABEL[r.type]}</Badge>
          {r.type === "product" && r.verified ? <Badge className="gap-1"><BadgeCheck className="h-3 w-3" /> Compra verificada</Badge> : null}
          <a href={r.contentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium hover:underline">{r.contentLabel} <ExternalLink className="h-3 w-3" /></a>
          <span className="ml-auto text-muted-foreground">Enviada em {dt(r.createdAt)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Cliente: <a href={`/admin/clientes/${r.userId}`} className="underline">{r.customer}</a> · {r.consent ? `Autorizou nome e avatar em ${dt(r.consentAt)}` : "Sem autorização — aparecerá como Anônimo"}
        </p>
        <p className="whitespace-pre-line break-words font-medium">{r.question}</p>
        {r.status === "cancelled" ? (
          <p className="text-sm text-muted-foreground">Motivo interno: {r.cancelReason || "—"}</p>
        ) : (
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={4} placeholder="Escreva a resposta da Adeconex…" />
        )}
        {r.publishedAt ? <p className="text-xs text-muted-foreground">Publicada em {dt(r.publishedAt)}</p> : null}
        <div className="flex flex-wrap gap-2">
          {r.status !== "cancelled" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => act("save_draft")}>{r.status === "published" ? "Salvar alteração" : "Salvar rascunho"}</Button>
              {r.status !== "published" ? <Button size="sm" disabled={answer.trim().length < 5} onClick={() => setConfirmPub(true)}>Publicar</Button> : <Button size="sm" variant="outline" onClick={() => act("unpublish")}>Despublicar</Button>}
              <Button size="sm" variant="ghost" onClick={() => setShowCancel((s) => !s)}>Cancelar pergunta</Button>
            </>
          ) : <Button size="sm" variant="outline" onClick={() => act("reopen")}>Reabrir</Button>}
          <Button size="sm" variant="ghost" onClick={() => setShowHist((s) => !s)}><History className="mr-1 h-4 w-4" /> Histórico</Button>
        </div>
        {showCancel ? (
          <div className="flex flex-wrap gap-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo interno (não aparece no site)" className="h-9 flex-1" />
            <Button size="sm" variant="destructive" onClick={() => act("cancel")}>Confirmar cancelamento</Button>
          </div>
        ) : null}
        {showHist ? (
          <ul className="space-y-1 rounded-md border hairline p-3 text-xs text-muted-foreground">
            {(events ?? []).map((e) => <li key={e.id}>{dt(e.created_at)} — <strong>{e.action}</strong> por {e.actor}{e.note ? ` · ${e.note}` : ""}</li>)}
            {events && !events.length ? <li>Sem registros.</li> : null}
          </ul>
        ) : null}
      </CardContent>
      <AlertDialog open={confirmPub} onOpenChange={setConfirmPub}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar pergunta e resposta?</AlertDialogTitle>
            <AlertDialogDescription>Elas ficarão visíveis para todos na página de "{r.contentLabel}", {r.consent ? "com o nome e o avatar do cliente (autorizado)" : "como Anônimo"}.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => act("publish", { confirm: true })}>Publicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
