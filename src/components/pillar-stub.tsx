import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Zap } from "lucide-react";
import type { ReactNode } from "react";

interface PillarStubProps {
  eyebrow: string;
  title: string;
  intro: string;
  keyPoints: string[];
  keywordFocus: string[];
  primaryCta?: { to: string; label: string };
  secondaryCta?: { to: string; label: string };
  children?: ReactNode;
}

/**
 * Página pillar preservando URL SEO do site antigo. O corpo é um stub técnico
 * enquanto a Frente 2 (conteúdo completo) não é publicada. Já entrega H1,
 * intro, key points e CTAs — suficiente para o Google não considerar thin
 * content e para não perder posição ao apontar o domínio.
 */
export function PillarStub({
  eyebrow,
  title,
  intro,
  keyPoints,
  keywordFocus,
  primaryCta,
  secondaryCta,
  children,
}: PillarStubProps) {
  return (
    <div className="bg-background">
      <section className="container-page py-16 md:py-24">
        <div className="max-w-3xl">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">{intro}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            {primaryCta ? (
              <Link
                to={primaryCta.to}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                {primaryCta.label} <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
            {secondaryCta ? (
              <Link
                to={secondaryCta.to}
                className="inline-flex items-center gap-2 rounded-md border hairline bg-background px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                {secondaryCta.label}
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-y hairline bg-surface-2">
        <div className="container-page grid gap-10 py-16 md:grid-cols-2">
          <div>
            <p className="eyebrow">O que você encontra aqui</p>
            <ul className="mt-5 space-y-3">
              {keyPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-foreground"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="eyebrow">Termos técnicos relacionados</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {keywordFocus.map((kw) => (
                <li
                  key={kw}
                  className="rounded-full border hairline bg-background px-3 py-1 font-mono text-xs uppercase tracking-wide text-muted-foreground"
                >
                  {kw}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-muted-foreground">
              Conteúdo técnico completo em publicação — Fase 2 da Plataforma
              Adeconex 2030.
            </p>
          </div>
        </div>
      </section>

      {children}

      <section className="container-page py-16">
        <div className="rounded-2xl ink-surface p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow text-white/70">Fale com um especialista</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Precisa de especificação técnica ou orçamento?
              </h2>
              <p className="mt-2 text-sm text-white/70">
                Nossa equipe atende do consumo mensal até projetos de
                identificação em larga escala.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/contato"
                className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90"
              >
                <Zap className="h-4 w-4" /> Solicitar orçamento
              </Link>
              <Link
                to="/marketplaces"
                className="inline-flex items-center gap-2 rounded-md border border-white/25 bg-transparent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
              >
                Comprar agora
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
