import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Award, Factory, Microscope, Target, Users } from "lucide-react";
import factoryImg from "@/assets/factory.jpg";
import { Section, SectionHeader } from "@/components/ui/section";

export const Route = createFileRoute("/empresa")({
  head: () => ({
    meta: [
      { title: "Empresa — Adeconex" },
      {
        name: "description",
        content:
          "Conheça a Adeconex: história, fábrica, equipe, missão e valores. Mais de 20 anos especializados em impressão térmica, identificação e automação.",
      },
      { property: "og:title", content: "Empresa — Adeconex" },
      {
        property: "og:description",
        content:
          "História, estrutura, controle de qualidade e equipe Adeconex. Referência nacional em impressão térmica e identificação.",
      },
      { property: "og:url", content: "/empresa" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/empresa" }],
  }),
  component: EmpresaPage,
});

function EmpresaPage() {
  return (
    <>
      <HeroEmpresa />
      <Timeline />
      <PillarsSection />
      <MissionVision />
      <CtaEmpresa />
    </>
  );
}

function HeroEmpresa() {
  return (
    <section className="border-b hairline bg-surface-2">
      <div className="container-page grid gap-12 py-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow">A Empresa</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Construímos identificação industrial{" "}
            <span className="text-muted-foreground">há mais de duas décadas.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Da primeira bobina de etiqueta vendida a uma plataforma nacional:
            a Adeconex nasceu para resolver problemas reais de impressão
            térmica e rastreabilidade no Brasil.
          </p>
          <div className="mt-8 grid max-w-lg grid-cols-3 gap-6 border-t hairline pt-6">
            {[
              { v: "20+", l: "Anos de operação" },
              { v: "5.000+", l: "Clientes ativos" },
              { v: "1M+", l: "Etiquetas/mês" },
            ].map((s) => (
              <div key={s.l}>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {s.l}
                </p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {s.v}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative">
          <img
            src={factoryImg}
            alt="Estrutura industrial Adeconex"
            width={1600}
            height={1000}
            loading="lazy"
            className="aspect-[4/3] w-full rounded-xl border hairline object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function Timeline() {
  const events = [
    { year: "Início", title: "Fundação da Adeconex", body: "Operação focada em consumíveis para impressão térmica no varejo e indústria." },
    { year: "Expansão", title: "Linha própria de etiquetas", body: "Produção interna de etiquetas adesivas e ampliação do portfólio de ribbons." },
    { year: "Cobertura", title: "Atendimento nacional", body: "Atuação em todos os estados com logística rastreável e suporte B2B." },
    { year: "Digital", title: "Marketplaces oficiais", body: "Lojas oficiais em Mercado Livre, Shopee, Amazon e Magalu." },
    { year: "2030", title: "Plataforma de autoridade", body: "Conteúdo técnico, ferramentas gratuitas e ecossistema digital completo." },
  ];
  return (
    <Section>
      <SectionHeader
        eyebrow="Linha do tempo"
        title="Capítulos que constroem uma referência nacional"
      />
      <ol className="mt-12 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-5">
        {events.map((e, i) => (
          <li key={i} className="bg-card p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-signal">
              {e.year}
            </p>
            <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">
              {e.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {e.body}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function PillarsSection() {
  const pillars = [
    { icon: Factory, title: "Produção", body: "Fábrica própria com linhas dedicadas a etiquetas e conversão de bobinas, com controle de processo." },
    { icon: Microscope, title: "Controle de qualidade", body: "Testes de aderência, durabilidade, leitura e compatibilidade em cada lote produzido." },
    { icon: Users, title: "Equipe técnica", body: "Especialistas em impressão térmica, ZPL, GS1 e RFID para apoiar do projeto à pós-venda." },
    { icon: Award, title: "Pós-venda", body: "Suporte responsivo, base de conhecimento e relacionamento contínuo com cada cliente." },
  ];
  return (
    <Section tone="muted">
      <SectionHeader
        eyebrow="Estrutura"
        title="Quatro pilares que sustentam cada entrega"
      />
      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map((p) => (
          <article key={p.title} className="bg-card p-6">
            <p.icon className="h-6 w-6 text-signal" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-semibold tracking-tight">
              {p.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {p.body}
            </p>
          </article>
        ))}
      </div>
    </Section>
  );
}

function MissionVision() {
  const items = [
    { label: "Missão", body: "Ser a plataforma brasileira mais confiável em soluções de impressão térmica, identificação e rastreabilidade — entregando conhecimento, produto e suporte." },
    { label: "Visão", body: "Posicionar a Adeconex como referência nacional em conteúdo técnico, tecnologia e soluções para o setor até 2030." },
    { label: "Valores", body: "Autoridade técnica, transparência, qualidade industrial, parceria de longo prazo e inovação contínua." },
  ];
  return (
    <Section>
      <div className="grid gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-3">
        {items.map((i) => (
          <div key={i.label} className="bg-card p-8">
            <Target className="h-6 w-6 text-signal" strokeWidth={1.5} />
            <p className="mt-4 eyebrow">{i.label}</p>
            <p className="mt-3 text-base leading-relaxed">{i.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

function CtaEmpresa() {
  return (
    <Section tone="ink">
      <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <p className="eyebrow text-white/60">Trabalhe com a Adeconex</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Especificação técnica feita por quem fabrica.
          </h2>
          <p className="mt-3 max-w-xl text-white/70">
            Fale com nossa equipe comercial ou técnica. Atendemos indústria,
            varejo, logística, integradoras e revendas.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-ink"
          >
            Falar com a Adeconex
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/catalogo"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white"
          >
            Conhecer catálogo
          </Link>
        </div>
      </div>
    </Section>
  );
}
