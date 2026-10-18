import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ExternalLink, Info, RotateCcw, XCircle } from "lucide-react";
import { trackSolution } from "@/lib/solution-tracker";
import { getPublicJourney } from "@/lib/solutions.functions";
import { absoluteUrl } from "@/lib/seo";
import {
  AFFILIATE_NOTICE, DISCLAIMER, GROUPS, ITEM_CATEGORIES, checkCompatibility, compareRows, externalHref, externalRel, groupOfStep, matches, safeTotal, visibleSteps, type Answers,
} from "@/lib/solutions.shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const journeyQuery = (slug: string) => queryOptions({ queryKey: ["solution-journey", slug], queryFn: () => getPublicJourney({ data: { slug } }) });

export const Route = createFileRoute("/comece-por-aqui/$slug")({
  loader: async ({ context, params }) => {
    const d = await context.queryClient.ensureQueryData(journeyQuery(params.slug));
    if (!d) throw notFound();
    return d;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [{ title: "Solução indisponível — Adeconex" }, { name: "robots", content: "noindex" }] };
    const j = loaderData.journey;
    const title = j.seo_title || `${j.title} — Comece por aqui | Adeconex`;
    const desc = j.seo_description || j.intro || "";
    const url = j.canonical_url || absoluteUrl(`/comece-por-aqui/${params.slug}`);
    const ld: object[] = [{
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
        { "@type": "ListItem", position: 2, name: "Comece por aqui", item: absoluteUrl("/comece-por-aqui") },
        { "@type": "ListItem", position: 3, name: j.title, item: url },
      ] }];
    if (j.faqs.length) ld.push({ "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: j.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) });
    const meta = [
      { title }, { name: "description", content: desc },
      { property: "og:title", content: title }, { property: "og:description", content: desc },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
      ...(j.indexable ? [] : [{ name: "robots", content: "noindex, follow" }]),
      ...(j.cover_url?.startsWith("https://") ? [{ property: "og:image", content: j.cover_url }, { name: "twitter:image", content: j.cover_url }] : []),
    ];
    return { meta, links: [{ rel: "canonical", href: url }], scripts: ld.map((x) => ({ type: "application/ld+json", children: JSON.stringify(x) })) };
  },
  errorComponent: () => <div className="container-page py-20">Não foi possível carregar esta solução agora.</div>,
  notFoundComponent: () => (
    <div className="container-page py-20">
      <p>Esta solução não está disponível.</p>
      <Link to="/comece-por-aqui" className="mt-3 inline-block text-primary underline">Ver todas as soluções</Link>
    </div>
  ),
  component: JourneyPage,
});

type Data = NonNullable<Awaited<ReturnType<typeof getPublicJourney>>>;
type Item = Data["steps"][number]["items"][number];
const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const catLabel = (v: string) => ITEM_CATEGORIES.find((c) => c.value === v)?.label ?? v;

function Prose({ text }: { text: string | null }) {
  if (!text?.trim()) return null;
  return <div className="space-y-3 text-muted-foreground">{text.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>;
}

function ItemCard({ item, slug, compare }: { item: Item; slug: string; compare?: { on: boolean; toggle: () => void; disabled: boolean } }) {
  const p = item.product;
  const e = item.external;
  const href = e ? externalHref({ is_affiliate: e.is_affiliate, ext_affiliate_url: e.ext_affiliate_url, ext_original_url: e.ext_original_url }) : null;
  const img = p?.image_url ?? e?.image_url;
  return (
    <div className="flex gap-4 rounded-lg border bg-card p-4">
      {img ? <img src={img} alt={p?.image_alt ?? e?.name ?? ""} loading="lazy" className="h-20 w-20 shrink-0 rounded object-contain bg-muted/30" /> : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{catLabel(item.item_category)}</Badge>
          <Badge variant={item.is_required ? "default" : "secondary"}>{item.is_required ? "Necessário" : "Opcional"}</Badge>
          {e ? <Badge variant="outline">{e.is_affiliate ? "Link de afiliado" : "Oferta externa"}</Badge> : null}
        </div>
        <p className="mt-2 font-medium">{p?.name ?? e?.name}</p>
        {e && (e.manufacturer || e.model) ? <p className="text-xs text-muted-foreground">{[e.manufacturer, e.model].filter(Boolean).join(" · ")}</p> : null}
        {item.role ? <p className="mt-1 text-sm">{item.role}</p> : null}
        {item.reason ? <p className="mt-1 text-sm text-muted-foreground">{item.reason}</p> : null}
        {item.quantity ? <p className="mt-1 text-xs text-muted-foreground">Quantidade sugerida: {item.quantity}</p> : null}
        {item.notes ? <p className="mt-1 text-xs text-muted-foreground"><Info className="mr-1 inline h-3 w-3" aria-hidden="true" />{item.notes}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {p ? (
            <>
              {p.price != null ? <span className="text-sm font-medium tabular-nums">{brl(p.price)}</span> : null}
              <Link to="/produto/$slug" params={{ slug: p.slug }} onClick={() => trackSolution(slug, "click_internal", { rec_id: item.id })}><Button size="sm">Ver produto</Button></Link>
            </>
          ) : href && e?.link_ok ? (
            <a href={href} target="_blank" rel={externalRel(!!e?.is_affiliate)} onClick={() => trackSolution(slug, e?.is_affiliate ? "click_affiliate" : "click_external", { rec_id: item.id })}>
              <Button size="sm" variant="outline">{e?.button || `Ver${e?.platform ? ` no ${e.platform}` : " oferta"}`} <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></Button>
            </a>
          ) : <span className="text-xs text-muted-foreground">Consulte nossa equipe sobre este item.</span>}
          {compare ? (
            <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={compare.on} disabled={compare.disabled && !compare.on} onChange={compare.toggle} /> Comparar
            </label>
          ) : null}
        </div>
        {e?.is_affiliate && href ? <p className="mt-2 text-xs text-muted-foreground">{AFFILIATE_NOTICE}</p> : null}
        {e ? <p className="mt-1 text-xs text-muted-foreground">Preço e disponibilidade externos não são confirmados pela Adeconex.</p> : null}
      </div>
    </div>
  );
}

function JourneyPage() {
  const { slug } = Route.useParams();
  const { data } = useSuspenseQuery(journeyQuery(slug));
  const { journey: j, steps } = data!;
  const key = `solution:${slug}`;
  const [answers, setAnswers] = useState<Answers>({});
  const [idx, setIdx] = useState(0);
  const [started, setStarted] = useState(false);
  const [cmp, setCmp] = useState<string[]>([]);
  useEffect(() => { trackSolution(slug, "view"); }, [slug]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) { const s = JSON.parse(raw); setAnswers(s.answers ?? {}); setIdx(s.idx ?? 0); setStarted(!!s.started); }
    } catch { /* ignore */ }
  }, [key]);
  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify({ answers, idx, started })); } catch { /* ignore */ }
  }, [key, answers, idx, started]);

  const shown = useMemo(() => visibleSteps(steps, answers), [steps, answers]);
  const cur = shown[Math.min(idx, shown.length - 1)];
  const itemsFor = (s: (typeof steps)[number]) => s.items.filter((it) => matches(it.show_when, answers));
  const choose = (stepId: string, value: string, multi: boolean) =>
    setAnswers((a) => {
      const prev = a[stepId] ?? [];
      return { ...a, [stepId]: multi ? (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]) : [value] };
    });
  const needsAnswer = cur && (cur.step_type === "single" || cur.step_type === "multiple") && cur.is_required && !(answers[cur.id]?.length);

  const finalItems = shown.filter((s) => s.step_type !== "final").flatMap((s) => itemsFor(s).map((it) => ({ it, group: groupOfStep(s.step_type) })));
  const total = safeTotal(finalItems.map(({ it }) => ({ price: it.product?.price ?? null, external: !it.product })));
  const internalSubtotal = finalItems.reduce((acc, { it }) => acc + (it.product?.price ?? 0), 0);
  const hasExternal = finalItems.some(({ it }) => !it.product);
  const nameOf = (it: Item) => it.product?.name ?? it.external?.name ?? "Item";
  const compat = checkCompatibility(finalItems.map(({ it }) => ({ name: nameOf(it), category: it.item_category, specs: it.specs })));
  const cmpItems = cmp.map((id) => finalItems.find((f) => f.it.id === id)?.it).filter(Boolean) as Item[];
  const cmpRows = compareRows(cmpItems.map((it) => ({ specs: it.specs, category: it.item_category })));
  const toggleCmp = (id: string) => setCmp((c) => {
    if (c.includes(id)) return c.filter((x) => x !== id);
    if (c.length >= 3) return c;
    if (c.length === 1) trackSolution(slug, "compare");
    return [...c, id];
  });
  const curId = cur?.id; const curType = cur?.step_type;
  useEffect(() => {
    if (!started || !curId) return;
    trackSolution(slug, "step", { step_id: curId });
    if (curType === "final") trackSolution(slug, "complete");
  }, [started, curId, curType, slug]);

  return (
    <main>
      <section className="border-b bg-muted/30">
        <div className="container-page py-12">
          <nav className="text-sm text-muted-foreground"><Link to="/comece-por-aqui" className="hover:underline">Comece por aqui</Link>{j.category ? ` / ${j.category.name}` : ""}</nav>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight md:text-4xl">{j.h1 || j.title}</h1>
          {j.intro ? <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{j.intro}</p> : null}
        </div>
      </section>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-8">
          {j.cover_url ? <img src={j.cover_url} alt={j.cover_alt ?? j.title} className="w-full rounded-xl object-cover" /> : null}
          <Prose text={j.content_before} />
          <Prose text={j.presentation} />

          <section aria-label="Assistente" className="rounded-xl border bg-card p-5 md:p-8">
            {!started || !cur ? (
              <div className="text-center">
                <p className="text-lg font-medium">Monte sua solução em {shown.length} {shown.length === 1 ? "etapa" : "etapas"}</p>
                <Button className="mt-4" onClick={() => { setStarted(true); setIdx(0); trackSolution(slug, "start"); }} disabled={!cur}>Começar <ArrowRight className="h-4 w-4" /></Button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Etapa {idx + 1} de {shown.length}</span>
                    <button type="button" className="inline-flex items-center gap-1 hover:underline" onClick={() => { setAnswers({}); setIdx(0); }}><RotateCcw className="h-3 w-3" /> Recomeçar</button>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${((idx + 1) / shown.length) * 100}%` }} /></div>
                </div>

                <h2 className="text-xl font-semibold">{cur.title}</h2>
                {cur.image_url ? <img src={cur.image_url} alt={cur.image_alt ?? ""} className="mt-4 max-h-72 rounded-lg object-contain" /> : null}
                <div className="mt-3"><Prose text={cur.body} /></div>
                {cur.guidance ? <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm"><Info className="mr-1 inline h-4 w-4 text-primary" aria-hidden="true" />{cur.guidance}</p> : null}

                {(cur.step_type === "single" || cur.step_type === "multiple") ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2" role={cur.step_type === "single" ? "radiogroup" : "group"}>
                    {cur.options.map((o) => {
                      const on = (answers[cur.id] ?? []).includes(o.value);
                      return (
                        <button key={o.value} type="button" role={cur.step_type === "single" ? "radio" : "checkbox"} aria-checked={on}
                          onClick={() => choose(cur.id, o.value, cur.step_type === "multiple")}
                          className={`rounded-lg border p-4 text-left transition-colors ${on ? "border-primary bg-primary/5" : "hover:border-primary/50"}`}>
                          <span className="flex items-center gap-2 font-medium">{on ? <Check className="h-4 w-4 text-primary" /> : null}{o.label}</span>
                          {o.description ? <span className="mt-1 block text-sm text-muted-foreground">{o.description}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {cur.step_type === "final" ? (
                  <div className="mt-5 space-y-6">
                    {GROUPS.map((g) => {
                      const list = finalItems.filter((f) => f.group === g.key);
                      if (!list.length) return null;
                      return (
                        <div key={g.key}>
                          <h3 className="mb-3 font-semibold">{g.label}</h3>
                          <div className="space-y-3">{list.map(({ it }) => <ItemCard key={it.id} item={it} slug={slug} compare={{ on: cmp.includes(it.id), toggle: () => toggleCmp(it.id), disabled: cmp.length >= 3 }} />)}</div>
                        </div>
                      );
                    })}
                    {finalItems.length ? (
                      <div className="rounded-lg border p-4 text-sm">
                        <p className="font-semibold">Conferência de compatibilidade</p>
                        {compat.notes.length === 0 && compat.missing.length === 0 ? (
                          <p className="mt-2 flex items-center gap-2 text-muted-foreground"><Check className="h-4 w-4 text-primary" /> Pelos dados cadastrados, os itens combinam entre si.</p>
                        ) : null}
                        <ul className="mt-2 space-y-2">
                          {compat.notes.map((n, i) => (
                            <li key={i} className="flex gap-2">
                              {n.level === "error" ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : n.level === "warning" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
                              <span>{n.message}</span>
                            </li>
                          ))}
                        </ul>
                        {compat.missing.length ? (
                          <p className="mt-3 text-muted-foreground">Ainda não temos todas as informações para conferir tudo ({compat.missing.slice(0, 4).join("; ")}{compat.missing.length > 4 ? "…" : ""}). Nossa equipe confirma antes da compra.</p>
                        ) : null}
                      </div>
                    ) : null}
                    {cmpItems.length >= 2 ? (
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <caption className="p-3 text-left font-semibold">Comparação lado a lado</caption>
                          <thead><tr className="border-t bg-muted/40"><th className="p-2 text-left font-medium">Item</th>{cmpItems.map((it) => <th key={it.id} className="p-2 text-left font-medium">{nameOf(it)}</th>)}</tr></thead>
                          <tbody>
                            <tr className="border-t"><td className="p-2 text-muted-foreground">Tipo</td>{cmpItems.map((it) => <td key={it.id} className="p-2">{catLabel(it.item_category)}</td>)}</tr>
                            <tr className="border-t"><td className="p-2 text-muted-foreground">Preço</td>{cmpItems.map((it) => <td key={it.id} className="p-2 tabular-nums">{it.product?.price != null ? brl(it.product.price) : "Consultar"}</td>)}</tr>
                            {cmpRows.map((r) => <tr key={r.label} className="border-t"><td className="p-2 text-muted-foreground">{r.label}</td>{r.values.map((v, i) => <td key={i} className="p-2">{v}</td>)}</tr>)}
                          </tbody>
                        </table>
                      </div>
                    ) : finalItems.length > 1 ? <p className="text-xs text-muted-foreground">Marque “Comparar” em 2 ou 3 itens para ver lado a lado.</p> : null}
                    {finalItems.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há itens cadastrados para as escolhas feitas. Fale com a nossa equipe.</p> : null}
                    {finalItems.length ? (
                      <div className="rounded-lg bg-muted/40 p-4 text-sm">
                        {total != null ? <p>Total estimado dos produtos Adeconex: <strong>{brl(total)}</strong></p>
                          : <>
                            {internalSubtotal > 0 ? <p>Subtotal dos produtos Adeconex com preço: <strong>{brl(internalSubtotal)}</strong></p> : null}
                            {hasExternal ? <p className="mt-1 text-muted-foreground">Itens externos não entram na soma, pois preço e estoque não são confirmados por nós.</p> : null}
                          </>}
                        <p className="mt-1 text-muted-foreground">Nada é adicionado ao carrinho automaticamente.</p>
                      </div>
                    ) : null}
                  </div>
                ) : itemsFor(cur).length ? (
                  <div className="mt-5 space-y-3">{itemsFor(cur).map((it) => <ItemCard key={it.id} item={it} slug={slug} />)}</div>
                ) : null}

                <div className="mt-8 flex justify-between gap-3">
                  <Button variant="outline" onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
                  {idx < shown.length - 1 ? (
                    <Button onClick={() => setIdx((i) => i + 1)} disabled={!!needsAnswer}>Avançar <ArrowRight className="h-4 w-4" /></Button>
                  ) : null}
                </div>
              </>
            )}
          </section>

          <Prose text={j.closing} />
          <Prose text={j.content_after} />

          {j.faqs.length ? (
            <section>
              <h2 className="mb-3 text-xl font-semibold">Perguntas frequentes</h2>
              <Accordion type="single" collapsible>
                {j.faqs.map((f, i) => (
                  <AccordionItem key={i} value={`f${i}`}>
                    <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                    <AccordionContent className="whitespace-pre-line text-muted-foreground">{f.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ) : null}
          <p className="text-xs text-muted-foreground">{DISCLAIMER}</p>
        </div>

        <aside className="space-y-4">
          {started && shown.length ? (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold">Suas etapas</p>
              <ol className="mt-3 space-y-1 text-sm">
                {shown.map((s, i) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setIdx(i)} className={`w-full rounded px-2 py-1 text-left ${i === idx ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"}`}>
                      {i + 1}. {s.title}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
          <div className="rounded-xl border bg-card p-4 text-sm">
            <p className="font-medium">Precisa de ajuda?</p>
            <p className="mt-1 text-muted-foreground">Nossa equipe confirma a compatibilidade antes da compra.</p>
            <Link to="/contato" className="mt-2 inline-block font-medium text-primary underline">Falar com a equipe</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
