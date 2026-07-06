import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { ProductCarousel } from "@/components/product-carousel";
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Download,
  Factory,
  FileBarChart2,
  Layers,
  Printer,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Workflow,
} from "lucide-react";
import heroImg from "@/assets/hero-printer.jpg";
import labelsImg from "@/assets/labels-macro.jpg";
import { Section, SectionHeader } from "@/components/ui/section";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title:
          "Adeconex — Plataforma brasileira de impressão térmica e identificação",
      },
      {
        name: "description",
        content:
          "Conteúdo técnico, ferramentas gratuitas, produtos e suporte para impressão térmica, etiquetas, ribbons, automação comercial e logística. Compre nos marketplaces oficiais ou solicite orçamento.",
      },
      { property: "og:title", content: "Adeconex — Plataforma 2030" },
      {
        property: "og:description",
        content:
          "Autoridade nacional em impressão térmica, identificação, etiquetagem e automação. Conteúdo, ferramentas e produtos em um só lugar.",
      },
      { property: "og:url", content: "/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />
      <Solutions />
      <CatalogTeaser />
      <Vitrines />
      <KnowledgePreview />
      <ToolsPreview />
      <Marketplaces />
      <ProofAndSocial />
      <FinalCta />
    </>
  );
}

function Vitrines() {
  return (
    <Suspense fallback={<div className="container-page py-12 text-sm text-muted-foreground">Carregando vitrine…</div>}>
      <ProductCarousel
        eyebrow="Vitrine"
        title="Etiquetas Couchê"
        description="Papel branco calandrado, ideal para uso geral, código de barras, preço e identificação."
        categorySlug="etiqueta-couche"
        ctaHref="/catalogo"
      />
      <ProductCarousel
        eyebrow="Vitrine"
        title="Etiquetas BOPP"
        description="Polipropileno branco, resistente à água, gordura e rasgo — perfeito para alimentos e validade."
        categorySlug="etiqueta-bopp"
        ctaHref="/catalogo"
      />
      <ProductCarousel
        eyebrow="Vitrine"
        title="Ribbons"
        description="Cera, cera-resina e resina, compatíveis com as principais impressoras térmicas do mercado."
        categorySlug="ribbon-cera"
        ctaHref="/catalogo"
      />
    </Suspense>
  );
}

/* ───────── Hero ───────── */
function Hero() {
  return (
    <section className="relative overflow-hidden ink-surface">
      <div
        aria-hidden
        className="absolute inset-0 grid-lines opacity-[0.07]"
      />
      <div className="container-page relative grid gap-12 py-20 md:py-28 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="eyebrow text-white/60">
            Plataforma Adeconex 2030
          </p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-white md:text-6xl">
            Impressão térmica e identificação{" "}
            <span className="signal-text">com autoridade técnica.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/70 md:text-lg">
            Mais do que um catálogo: um ecossistema digital com conteúdo,
            ferramentas gratuitas, documentação e produtos para etiquetas,
            ribbons, impressoras, código de barras e logística.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/catalogo"
              className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90"
            >
              Explorar catálogo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/conhecimento"
              className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
            >
              Centro de conhecimento
            </Link>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-8">
            {[
              { v: "20+", l: "Anos de mercado" },
              { v: "5.000+", l: "Clientes B2B" },
              { v: "4,9★", l: "Avaliação Google" },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/50">
                  {s.l}
                </dt>
                <dd className="mt-1 font-display text-2xl font-semibold text-white">
                  {s.v}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="relative">
          <div className="relative aspect-[4/5] overflow-hidden rounded-xl border border-white/10 shadow-elevated">
            <img
              src={heroImg}
              alt="Impressora térmica industrial Adeconex em operação com etiqueta de código de barras saindo do equipamento"
              width={1920}
              height={1280}
              className="h-full w-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/60">
                Em operação
              </p>
              <p className="mt-1 text-sm text-white">
                Linha industrial de impressão térmica de transferência —
                ribbon resin + etiqueta BOPP
              </p>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-4 hidden rounded-lg border border-white/10 bg-ink/80 p-3 text-xs font-mono text-white/70 backdrop-blur md:block">
            ZPL · GS1 · 203/300 dpi
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── Trust strip ───────── */
function TrustStrip() {
  const items = [
    "Fábrica própria",
    "Suporte técnico nacional",
    "ZPL / EPL / GS1",
    "Código de barras GS1",
    "Logística rastreável",
    "Atendimento B2B dedicado",
  ];
  return (
    <div className="border-y hairline bg-surface-2">
      <div className="container-page flex flex-wrap items-center gap-x-8 gap-y-3 py-5 text-xs font-mono uppercase tracking-[0.16em] text-muted-foreground">
        {items.map((i) => (
          <span key={i} className="inline-flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal" />
            {i}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────── Solutions ───────── */
function Solutions() {
  const cards = [
    {
      icon: Tag,
      title: "Etiquetas adesivas",
      copy: "BOPP, papel, térmica direta, transferência, removível e personalizada por aplicação.",
    },
    {
      icon: Layers,
      title: "Ribbons",
      copy: "Cera, cera-resina e resina. Compatibilidade testada para Zebra, Argox, Elgin, TSC e Honeywell.",
    },
    {
      icon: Printer,
      title: "Impressoras térmicas",
      copy: "Desktop, industrial e mobile. Especificação técnica, vídeos e suporte pós-venda.",
    },
    {
      icon: Workflow,
      title: "Automação comercial",
      copy: "Coletores, leitores, balanças e periféricos integrados ao seu ERP.",
    },
    {
      icon: Factory,
      title: "Logística & Indústria",
      copy: "Soluções de identificação para WMS, expedição, picking e linha de produção.",
    },
  ];
  return (
    <Section>
      <SectionHeader
        eyebrow="Soluções"
        title="O que entregamos para o seu chão de fábrica e operação"
        description="Cobertura completa da cadeia de identificação industrial — do consumível ao equipamento, do projeto ao suporte."
      />
      <div className="mt-12 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <article key={c.title} className="group bg-card p-6 transition-colors hover:bg-surface-2">
            <c.icon className="h-6 w-6 text-signal" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-semibold tracking-tight">
              {c.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {c.copy}
            </p>
            <Link
              to="/catalogo"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground"
            >
              Ver linha
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ───────── Catalog teaser ───────── */
function CatalogTeaser() {
  return (
    <Section tone="muted">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="order-2 lg:order-1">
          <div className="overflow-hidden rounded-xl border hairline">
            <img
              src={labelsImg}
              alt="Macro de etiquetas com código de barras em rolo industrial"
              width={1280}
              height={960}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <p className="eyebrow">Catálogo técnico</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Cada produto é uma página técnica completa —{" "}
            <span className="text-muted-foreground">não uma vitrine.</span>
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Especificações, aplicações, materiais e impressoras compatíveis,
            vídeos, downloads, FAQ e comparativos. Você escolhe se compra no
            marketplace, no B2B ou solicita orçamento direto.
          </p>
          <ul className="mt-6 grid gap-2 text-sm">
            {[
              "Ficha técnica e datasheet PDF",
              "Compatibilidade com impressoras e materiais",
              "Vídeos de aplicação real",
              "FAQ e comparativos lado a lado",
              "Botões: orçamento • marketplace • B2B",
            ].map((i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-signal" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/catalogo"
            className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
          >
            Acessar catálogo
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </Section>
  );
}

/* ───────── Knowledge ───────── */
function KnowledgePreview() {
  const topics = [
    { icon: BookOpen, label: "Guias completos", to: "/conhecimento" },
    { icon: FileBarChart2, label: "Comparativos", to: "/conhecimento" },
    { icon: Sparkles, label: "Boas práticas", to: "/conhecimento" },
  ];
  const categories = [
    "Etiquetas", "Ribbon", "Impressoras", "Automação",
    "Código de barras", "Logística", "Mercado Livre",
    "Marketplace", "Indústria", "Papelaria", "Tutoriais",
  ];
  return (
    <Section>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <SectionHeader
          eyebrow="Centro de conhecimento"
          title="Conteúdo técnico que resolve dúvidas reais do mercado"
          description="Categorias organizadas para indústria, varejo, papelaria, logística e profissionais de automação. Cada artigo é otimizado para SEO e para mecanismos de IA."
        />
        <Link
          to="/conhecimento"
          className="inline-flex items-center gap-2 text-sm font-medium text-foreground"
        >
          Ir para o portal técnico
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {topics.map((t) => (
          <Link
            key={t.label}
            to={t.to}
            className="group flex items-center justify-between rounded-xl border hairline bg-card p-5 transition-colors hover:bg-surface-2"
          >
            <span className="flex items-center gap-3">
              <t.icon className="h-5 w-5 text-signal" strokeWidth={1.5} />
              <span className="font-medium">{t.label}</span>
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {categories.map((c) => (
          <Link
            key={c}
            to="/conhecimento"
            className="rounded-full border hairline bg-card px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-ink-soft hover:bg-surface-2"
          >
            {c}
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* ───────── Tools ───────── */
function ToolsPreview() {
  const tools = [
    { name: "Gerador de QR Code", desc: "PNG/SVG, dados livres, alta resolução." },
    { name: "Gerador de Código de Barras", desc: "EAN-13, Code 128, GS1-128 e mais." },
    { name: "Calculadora de Ribbon", desc: "Estime metragem por rolo, largura e tiragem." },
    { name: "Etiquetas por Rolo", desc: "Quantidade real por gap, núcleo e diâmetro." },
    { name: "Calculadora de Consumo", desc: "Volume mensal de etiquetas e ribbons." },
    { name: "Gerador ZPL", desc: "Pré-visualização e exportação de comandos ZPL." },
  ];
  return (
    <Section tone="ink">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-white/60">Ferramentas gratuitas</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Calculadoras e geradores que economizam horas do seu dia.
          </h2>
          <p className="mt-4 text-white/70 md:text-lg">
            Sem login, sem fricção. Cada ferramenta tem sua própria página
            otimizada para SEO — entregue valor primeiro, vender vem depois.
          </p>
        </div>
        <Link
          to="/ferramentas"
          className="inline-flex items-center gap-2 self-start rounded-md bg-white px-5 py-3 text-sm font-medium text-ink"
        >
          Ver biblioteca completa
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
        {tools.map((t) => (
          <Link
            key={t.name}
            to="/ferramentas"
            className="group bg-ink p-6 transition-colors hover:bg-white/5"
          >
            <Calculator className="h-5 w-5 text-signal" strokeWidth={1.5} />
            <h3 className="mt-4 font-display text-lg font-semibold text-white">
              {t.name}
            </h3>
            <p className="mt-2 text-sm text-white/60">{t.desc}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-white">
              Abrir ferramenta
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </div>
    </Section>
  );
}

/* ───────── Marketplaces ───────── */
function Marketplaces() {
  const channels = [
    { name: "Mercado Livre", tag: "MercadoLíder" },
    { name: "Shopee", tag: "Loja oficial" },
    { name: "Amazon", tag: "Vendido por Adeconex" },
    { name: "Magalu", tag: "Loja oficial" },
  ];
  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow">Marketplace Hub</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            Compre onde preferir — Adeconex em todos os canais oficiais.
          </h2>
          <p className="mt-4 text-muted-foreground md:text-lg">
            Você escolhe a melhor experiência de compra. Para pedidos
            recorrentes ou volume, a Área B2B oferece tabela personalizada,
            histórico e reposição automática.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/marketplaces"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Ver canais oficiais
              <ShoppingBag className="h-4 w-4" />
            </Link>
            <Link
              to="/b2b"
              className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium"
            >
              Entrar na Área B2B
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {channels.map((c) => (
            <Link
              key={c.name}
              to="/marketplaces"
              className="flex flex-col justify-between rounded-xl border hairline bg-card p-5 transition-colors hover:bg-surface-2"
            >
              <span className="eyebrow text-[10px]">{c.tag}</span>
              <span className="mt-6 font-display text-xl font-semibold tracking-tight">
                {c.name}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                Abrir loja oficial
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ───────── Proof / social ───────── */
function ProofAndSocial() {
  const reviews = [
    {
      name: "Carlos M.",
      role: "Gerente de Logística",
      body: "Suporte técnico de outra categoria. Resolveram nosso problema de ribbon resinado em menos de uma hora.",
    },
    {
      name: "Patrícia L.",
      role: "Compras — Indústria alimentícia",
      body: "Site é praticamente uma enciclopédia. Encontro especificação completa antes de pedir orçamento.",
    },
    {
      name: "Eduardo S.",
      role: "Automação comercial",
      body: "Pedido recorrente pela área B2B virou rotina. Economizo tempo todo mês.",
    },
  ];
  return (
    <Section tone="muted">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="eyebrow">Prova social</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
            4,9 / 5 no Google.{" "}
            <span className="text-muted-foreground">Há mais de uma década.</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            Indústrias, papelarias, varejistas, integradoras e operadores
            logísticos confiam na Adeconex como referência em identificação.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-ember text-ember" />
              ))}
            </div>
            <span className="font-mono text-sm text-ink-soft">
              Avaliações Google verificadas
            </span>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {reviews.map((r) => (
            <figure
              key={r.name}
              className="rounded-xl border hairline bg-card p-5"
            >
              <div className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-ember text-ember" />
                ))}
              </div>
              <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
                "{r.body}"
              </blockquote>
              <figcaption className="mt-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{r.name}</span> ·{" "}
                {r.role}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ───────── Final CTA ───────── */
function FinalCta() {
  return (
    <Section>
      <div className="rounded-2xl border hairline bg-card p-8 shadow-card md:p-12">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-center">
          <div>
            <p className="eyebrow">Próximo passo</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
              Vamos especificar a sua solução de identificação.
            </h2>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Conte para o nosso time técnico o seu cenário: aplicação,
              volume, equipamentos atuais e ambiente. Retornamos com a
              especificação certa — sem empurrar produto.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link
              to="/contato"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Solicitar orçamento
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/downloads"
              className="inline-flex items-center justify-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium"
            >
              Central de downloads
              <Download className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
