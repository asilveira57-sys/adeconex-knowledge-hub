import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";

export function ModulePlaceholder({
  eyebrow,
  title,
  description,
  features,
  links = [],
  primaryCta = { to: "/contato", label: "Solicitar orçamento" },
  secondaryCta = { to: "/", label: "Voltar ao início" },
}: {
  eyebrow: string;
  title: string;
  description: string;
  features: string[];
  links?: { to: string; label: string }[];
  primaryCta?: { to: string; label: string };
  secondaryCta?: { to: string; label: string };
}) {
  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-20">
          <div className="max-w-3xl">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
              {description}
            </p>
            {links.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="inline-flex items-center gap-2 rounded-full border hairline bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
                  >
                    {l.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to={primaryCta.to}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
              >
                {primaryCta.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={secondaryCta.to}
                className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium"
              >
                {secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeader
          eyebrow="O que este módulo entregará"
          title="Roadmap detalhado da Plataforma Adeconex 2030"
        />
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f} className="bg-card p-5">
              <CheckCircle2 className="h-5 w-5 text-signal" strokeWidth={1.5} />
              <p className="mt-3 text-sm">{f}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
          Este módulo está em construção como parte da Fase 1 da Plataforma
          Adeconex 2030. Enquanto isso, fale com nossa equipe ou conheça os
          demais módulos pelo menu.
        </p>
      </Section>
    </>
  );
}
