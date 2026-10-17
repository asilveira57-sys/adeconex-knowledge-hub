import { useEffect, useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, MessageCircleQuestion } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getMyQuestionIdentity, getPublishedQuestions, submitQuestion } from "@/lib/questions.functions";
import { ANONYMOUS_LABEL, QUESTION_MAX, QUESTION_MIN, type PublicQuestion } from "@/lib/questions.shared";
import { UserAvatar } from "./user-avatar";

export type QuestionTarget = { type: "product"; id: string } | { type: "download"; id: string } | { type: "tool"; path: string };
type Page = { items: PublicQuestion[]; total: number };

const keyOf = (t: QuestionTarget) => ["questions", t.type, t.type === "tool" ? t.path : t.id];
export const questionsQuery = (t: QuestionTarget) => ({
  queryKey: [...keyOf(t), 0],
  queryFn: () => getPublishedQuestions({ data: { target: t, page: 0 } }),
});
export const loadQuestions = (t: QuestionTarget) => getPublishedQuestions({ data: { target: t, page: 0 } }).catch(() => null);

const fmt = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

export function ContentQuestions({ target, title, initial }: { target: QuestionTarget; title: string; initial?: Page | null }) {
  const { pathname } = useLocation();
  const { data } = useQuery({ ...questionsQuery(target), initialData: initial ?? undefined });
  const [extra, setExtra] = useState<PublicQuestion[]>([]);
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => { setExtra([]); setPage(0); }, [pathname]);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: s }) => {
      setSignedIn(!!s.session);
      if (s.session && window.location.hash === "#fazer-pergunta") setOpen(true);
    });
  }, []);

  const items = [...(data?.items ?? []), ...extra];
  const total = data?.total ?? 0;
  const more = async () => {
    setLoadingMore(true);
    try {
      const r = await getPublishedQuestions({ data: { target, page: page + 1 } });
      setExtra((e) => [...e, ...r.items]); setPage(page + 1);
    } finally { setLoadingMore(false); }
  };

  const authHref = `/auth?motivo=pergunta&redirect=${encodeURIComponent(`${pathname}#fazer-pergunta`)}`;

  return (
    <section id="perguntas" aria-labelledby="perguntas-titulo" className="container-page mt-16 scroll-mt-24 border-t hairline py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="perguntas-titulo" className="font-display text-2xl font-semibold tracking-tight">Perguntas e respostas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Dúvidas de clientes sobre {title}, respondidas pela equipe Adeconex.</p>
        </div>
        {signedIn ? (
          <Button onClick={() => setOpen((o) => !o)}><MessageCircleQuestion className="mr-2 h-4 w-4" /> Fazer uma pergunta</Button>
        ) : (
          <Button asChild><a href={authHref}><MessageCircleQuestion className="mr-2 h-4 w-4" /> Fazer uma pergunta</a></Button>
        )}
      </div>

      {open && signedIn ? <QuestionForm target={target} onDone={() => setOpen(false)} /> : null}

      {items.length === 0 ? (
        <p className="mt-6 rounded-lg border hairline bg-card p-6 text-sm text-muted-foreground">
          Ainda não há perguntas publicadas sobre este conteúdo. Tem alguma dúvida? Envie a primeira — nossa equipe responde e publica aqui.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((q) => (
            <li key={q.id}>
              <article className="rounded-xl border hairline bg-card p-5">
                <div className="flex items-start gap-3">
                  <UserAvatar avatar={q.avatar} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{q.author} perguntou
                      {q.verified ? <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-medium text-primary"><BadgeCheck className="h-3 w-3" aria-hidden="true" /> Compra verificada</span> : null}</p>
                    <h3 className="mt-0.5 whitespace-pre-line break-words text-base font-medium">{q.question}</h3>
                  </div>
                </div>
                <div className="mt-4 border-l-2 border-primary pl-4">
                  <p className="text-xs font-medium text-primary">Resposta da Adeconex · <time dateTime={q.publishedAt}>{fmt(q.publishedAt)}</time></p>
                  <p className="mt-1 whitespace-pre-line break-words text-sm leading-relaxed text-muted-foreground">{q.answer}</p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      {items.length < total ? (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={more} disabled={loadingMore}>{loadingMore ? "Carregando…" : `Ver mais perguntas (${total - items.length})`}</Button>
        </div>
      ) : null}
    </section>
  );
}

function QuestionForm({ target, onDone }: { target: QuestionTarget; onDone: () => void }) {
  const idFn = useServerFn(getMyQuestionIdentity);
  const send = useServerFn(submitQuestion);
  const qc = useQueryClient();
  const { data: me } = useQuery({ queryKey: ["questions", "me"], queryFn: () => idFn() });
  const [text, setText] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length < QUESTION_MIN) { toast.error(`Escreva pelo menos ${QUESTION_MIN} caracteres.`); return; }
    setBusy(true);
    try {
      await send({ data: { target, question: text, consent, website: hp || undefined } });
      toast.success("Pergunta enviada! Ela será publicada aqui depois da resposta da equipe.");
      setText(""); setConsent(false); onDone();
      qc.invalidateQueries({ queryKey: keyOf(target) });
      if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-xl border hairline bg-surface-2 p-5">
      <p className="text-sm">Envie sua pergunta sobre este conteúdo. Nossa equipe vai analisar e responder antes da publicação.</p>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={QUESTION_MAX} rows={4} required aria-label="Sua pergunta" placeholder="Escreva sua pergunta…" />
      <p className="text-right text-xs text-muted-foreground">{text.length}/{QUESTION_MAX}</p>
      <input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} className="hidden" aria-hidden="true" name="website" />
      <div className="flex items-center gap-3 rounded-lg border hairline bg-card p-3">
        <UserAvatar avatar={consent ? me?.avatar ?? null : null} size={36} />
        <div className="text-sm">
          <p className="font-medium">{consent ? me?.name ?? "…" : ANONYMOUS_LABEL}</p>
          <p className="text-xs text-muted-foreground">Assim sua pergunta aparecerá publicamente.{" "}
            <Link to="/minha-conta" className="underline">Alterar imagem de perfil</Link></p>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
        <span>Autorizo a publicação do meu nome de exibição e do meu avatar junto à pergunta, após a aprovação da equipe.</span>
      </label>
      <p className="text-xs text-muted-foreground">Saiba como tratamos seus dados na <Link to="/politica-de-privacidade" className="underline">Política de Privacidade</Link>.</p>
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>{busy ? "Enviando…" : "Enviar pergunta"}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancelar</Button>
      </div>
    </form>
  );
}
