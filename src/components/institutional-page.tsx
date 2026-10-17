import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { INSTITUTIONAL_PAGES, type InstPage } from "@/content/institutional-pages";

const SITE = "https://adeconex.com.br";

export function institutionalHead(key: string) {
  const p = INSTITUTIONAL_PAGES[key];
  const url = `${SITE}${p.path}`;
  return {
    meta: [
      { title: p.title },
      { name: "description", content: p.description },
      { property: "og:title", content: p.title },
      { property: "og:description", content: p.description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

export function InstitutionalPage({ pageKey }: { pageKey: string }) {
  const p: InstPage = INSTITUTIONAL_PAGES[pageKey];
  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-14 md:py-20">
          <nav aria-label="Trilha" className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Início</Link> <span aria-hidden>/</span> {p.group}
          </nav>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">{p.h1}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{p.intro}</p>
          <p className="mt-4 text-xs text-muted-foreground">Atualizado em {p.updated}</p>
        </div>
      </section>
      <div className="container-page max-w-3xl py-12">
        {p.draftNotice && (
          <p className="mb-8 flex gap-2 rounded-md border hairline bg-muted p-4 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-primary" aria-hidden /> {p.draftNotice}
          </p>
        )}
        <div className="space-y-10">
          {p.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{s.heading}</h2>
              {s.paragraphs?.map((t) => (
                <p key={t} className="mt-3 leading-relaxed text-ink-soft">{t}</p>
              ))}
              {s.list && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-ink-soft">
                  {s.list.map((t) => <li key={t}>{t}</li>)}
                </ul>
              )}
              {s.pending && (
                <p className="mt-3 rounded-md border border-dashed border-primary/50 p-3 text-sm text-muted-foreground">
                  ⚠ {s.pending}
                </p>
              )}
            </section>
          ))}
        </div>
        {p.links && (
          <div className="mt-12 flex flex-wrap gap-3 border-t hairline pt-8">
            {p.links.map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-1.5 rounded-md border hairline px-4 py-2 text-sm font-medium hover:bg-accent">
                {l.label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
