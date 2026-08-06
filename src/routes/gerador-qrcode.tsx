import { createFileRoute, Link } from "@tanstack/react-router";
import { QrGenerator } from "@/components/tools/qr-generator";
import { Section, SectionHeader } from "@/components/ui/section";
import { absoluteUrl } from "@/lib/seo";
import { ArrowRight, ChevronRight, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PATH = "/gerador-qrcode";
const URL = absoluteUrl(PATH);
// Cache-busting por nome de arquivo: ao trocar a arte, publique um novo
// /og/gerador-qrcode.v<AAAAMMDD>.png e atualize a versão abaixo.
const OG_IMAGE_VERSION = "20260805";
const OG_IMAGE = absoluteUrl(`/og/gerador-qrcode.v${OG_IMAGE_VERSION}.png`);
const TITLE = "Gerador de QR Code Grátis com Logo | Adeconex";
const DESCRIPTION =
  "Crie QR Code grátis para link, WhatsApp, Wi-Fi, PIX, texto e contato. Personalize cores e logo e baixe em PNG ou SVG com fundo transparente.";

const FAQ: { q: string; a: string }[] = [
  {
    q: "A geração de QR Code é gratuita?",
    a: "Sim. A ferramenta é gratuita e não exige cadastro, login ou pagamento para criar e baixar seus códigos.",
  },
  {
    q: "O QR Code criado tem prazo de validade?",
    a: "Não. O código é estático: o conteúdo fica gravado na própria imagem e continua funcionando enquanto o destino informado existir.",
  },
  {
    q: "Posso colocar meu logotipo no QR Code?",
    a: "Sim. Envie um arquivo PNG, JPG, SVG ou WebP de até 1 MB. Ao adicionar o logotipo, a correção de erro passa automaticamente para o nível H, que preserva a leitura.",
  },
  {
    q: "Qual formato é melhor para impressão?",
    a: "Para etiquetas e materiais impressos, prefira o SVG, que é vetorial e não perde qualidade em nenhum tamanho. O PNG em 2.000 ou 3.000 px também atende bem.",
  },
  {
    q: "Como baixar o QR Code com fundo transparente?",
    a: "Ative a opção Fundo transparente na seção de personalização. O arquivo baixado em PNG ou SVG sai com transparência real, sem o quadriculado que aparece apenas na pré-visualização.",
  },
  {
    q: "O conteúdo informado fica armazenado?",
    a: "Não. Todo o processamento acontece no seu navegador. Links, telefones, senhas de Wi-Fi, códigos PIX, contatos e logotipos não são enviados nem salvos em nossos servidores.",
  },
  {
    q: "Posso usar o QR Code comercialmente?",
    a: "Sim. Os códigos gerados podem ser usados livremente em embalagens, etiquetas, catálogos, cardápios, materiais promocionais e identificação interna.",
  },
  {
    q: "Qual é o tamanho mínimo para impressão?",
    a: "Como referência, use pelo menos 20 × 20 mm para conteúdos curtos. Códigos com muito conteúdo ou com logotipo pedem 30 mm ou mais.",
  },
  {
    q: "O QR Code continua funcionando depois do download?",
    a: "Sim. O arquivo baixado já contém o código completo e funciona sem depender da nossa página.",
  },
  {
    q: "Qual é a diferença entre QR Code estático e dinâmico?",
    a: "No estático, gerado aqui, o conteúdo é fixo e não pode ser alterado depois de impresso. No dinâmico, o código aponta para um redirecionador que pode mudar de destino — e depende de um serviço ativo para continuar funcionando.",
  },
];

export const Route = createFileRoute("/gerador-qrcode")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "Gerador de QR Code Adeconex",
          url: URL,
          applicationCategory: "UtilitiesApplication",
          operatingSystem: "Web",
          browserRequirements: "Navegador moderno com JavaScript",
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          publisher: { "@type": "Organization", name: "Adeconex", url: absoluteUrl("/") },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Ferramentas", item: absoluteUrl("/ferramentas") },
            { "@type": "ListItem", position: 3, name: "Gerador de QR Code", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQ.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: QrCodePage,
});

function ShareVersionButton() {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${URL}?v=${OG_IMAGE_VERSION}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copiado!", {
        description: "Compartilhe sem preview antigo.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-md border hairline bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Copiar link de compartilhamento com versão atualizada"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" aria-hidden />
      ) : (
        <Copy className="h-4 w-4" aria-hidden />
      )}
      {copied ? "Link copiado" : "Copiar link"}
    </button>
  );
}

function WhatsAppShareButton() {
  const shareUrl = `${URL}?v=${OG_IMAGE_VERSION}`;
  const text = encodeURIComponent(
    `Crie QR Code grátis para link, WhatsApp, Wi-Fi, PIX e mais na Adeconex: ${shareUrl}`
  );
  const whatsappUrl = `https://wa.me/?text=${text}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Compartilhar link versionado pelo WhatsApp"
    >
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M17.472 14.382c-.297-.596-1.058-.872-1.634-.602l-.51.237c-.247.113-.54.04-.692-.167l-.723-.99a.57.57 0 0 1 .1-.803 8.2 8.2 0 0 0 1.68-2.037 8.24 8.24 0 0 0 .948-3.535.57.57 0 0 0-.568-.633h-1.14a.57.57 0 0 0-.568.515 6.74 6.74 0 0 1-.78 2.94 6.76 6.76 0 0 1-1.905 2.25.57.57 0 0 1-.8-.1l-.648-.89a.57.57 0 0 1 .08-.79 4.94 4.94 0 0 0 1.17-1.545 4.97 4.97 0 0 0 .55-2.19A5.01 5.01 0 0 0 10.5 3a5.02 5.02 0 0 0-4.97 4.41.57.57 0 0 1-.568.515H3.822a.57.57 0 0 1-.568-.633 8.24 8.24 0 0 0 .948 3.535 8.2 8.2 0 0 0 1.68 2.037.57.57 0 0 1 .1.803l-.723.99c-.152.207-.445.28-.692.167l-.51-.237c-.576-.27-1.337.006-1.634.602C1.57 15.69 1.14 16.73 1.14 17.83c0 .16.013.32.04.477.165 1.03 1.02 1.79 2.06 1.9l.37.04c.34.037.68-.06.97-.27l1.15-.83a.57.57 0 0 1 .67 0l1.15.83c.29.21.63.307.97.27l.37-.04c1.04-.11 1.895-.87 2.06-1.9.027-.157.04-.317.04-.477 0-1.1-.43-2.14-1.21-2.948zM12 21.5a9.5 9.5 0 1 1 0-19 9.5 9.5 0 0 1 0 19z" />
      </svg>
      WhatsApp
    </a>
  );
}

function QrCodePage() {
  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-12 md:py-16">
          <nav aria-label="Trilha de navegação" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <li>
                <Link to="/" className="hover:text-foreground">Início</Link>
              </li>
              <ChevronRight className="h-3 w-3" aria-hidden />
              <li>
                <Link to="/ferramentas" className="hover:text-foreground">Ferramentas</Link>
              </li>
              <ChevronRight className="h-3 w-3" aria-hidden />
              <li aria-current="page" className="text-foreground">Gerador de QR Code</li>
            </ol>
          </nav>
          <p className="eyebrow">Ferramenta gratuita</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Gerador de QR Code Grátis
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
            Crie seu QR Code personalizado para links, WhatsApp, Wi-Fi, PIX, contatos e outros
            conteúdos. Adicione seu logotipo, escolha as cores e faça o download em PNG ou SVG.
          </p>
          <ShareVersionButton />
        </div>
      </section>

      <div className="container-page py-12 md:py-16">
        <h2 className="sr-only">Crie seu QR Code personalizado</h2>
        <QrGenerator />
      </div>

      <Section tone="muted">
        <SectionHeader
          eyebrow="Passo a passo"
          title="Como criar um QR Code grátis"
          description="Cinco passos para sair do conteúdo ao arquivo pronto para impressão."
        />
        <ol className="mt-10 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Escolha o tipo", "Link, WhatsApp, Wi-Fi, PIX, contato, texto e mais."],
            ["Preencha os dados", "Os campos mudam conforme o tipo selecionado."],
            ["Personalize", "Cores, formato dos módulos, margem e logotipo central."],
            ["Teste a leitura", "Confira a pré-visualização e leia com o celular."],
            ["Baixe o arquivo", "PNG em até 3.000 px ou SVG vetorial."],
          ].map(([t, d], i) => (
            <li key={t} className="bg-card p-5">
              <span className="font-mono text-xs text-signal">0{i + 1}</span>
              <h3 className="mt-2 text-sm font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <article>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Para que serve um QR Code?
            </h2>
            <p className="mt-3 text-muted-foreground">
              O QR Code conecta o mundo físico ao digital em um gesto. Na indústria e no varejo ele
              aparece em etiqueta com QR Code para rastreio de lote, identificação de ativos,
              conferência de expedição, manuais de equipamento, cardápios, catálogos e campanhas de
              relacionamento. Como o conteúdo é lido pela câmera do celular, ele elimina digitação
              manual e reduz erro de anotação em operação.
            </p>
            <h3 className="mt-6 font-display text-lg font-semibold">Usos mais comuns</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• QR Code para WhatsApp em embalagens e materiais de pós-venda.</li>
              <li>• QR Code para Wi-Fi em recepções, salas e áreas de convivência.</li>
              <li>• QR Code PIX em comandas, balcões e boletos internos.</li>
              <li>• Rastreabilidade de produção, estoque e patrimônio.</li>
            </ul>
          </article>

          <article>
            <h2 className="font-display text-2xl font-semibold tracking-tight">QR Code com logotipo</h2>
            <p className="mt-3 text-muted-foreground">
              Um QR Code com logo reforça a marca sem comprometer a leitura, desde que o desenho
              central ocupe uma área pequena e o nível de correção de erro seja alto. Por isso, ao
              enviar um logotipo a ferramenta ativa automaticamente a correção H, que recupera até
              cerca de 30% dos módulos danificados ou cobertos.
            </p>
            <h2 className="mt-8 font-display text-2xl font-semibold tracking-tight">
              QR Code com fundo transparente
            </h2>
            <p className="mt-3 text-muted-foreground">
              O fundo transparente permite aplicar o código sobre artes, embalagens e rótulos
              coloridos. Vale um cuidado: a transparência não substitui o contraste. Aplique sempre
              sobre superfície clara e uniforme, mantendo os módulos escuros.
            </p>
          </article>
        </div>
      </Section>

      <Section tone="muted">
        <div className="grid gap-10 lg:grid-cols-2">
          <article>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              PNG ou SVG: qual formato utilizar?
            </h2>
            <p className="mt-3 text-muted-foreground">
              O QR Code em PNG é ideal para uso digital — site, apresentação, redes sociais, e-mail —
              e para impressões pequenas quando exportado em alta resolução. O QR Code em SVG é
              vetorial: mantém nitidez em qualquer ampliação e é o formato indicado para gráficas,
              plotagem e artes de etiqueta.
            </p>
            <h2 className="mt-8 font-display text-2xl font-semibold tracking-tight">
              Como imprimir QR Code em etiquetas
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>• Use bom contraste entre o código e o fundo da etiqueta.</li>
              <li>• Não distorça a arte: o código precisa permanecer quadrado.</li>
              <li>• Preserve a margem de segurança ao redor do código.</li>
              <li>• Prefira SVG para tamanhos maiores e artes profissionais.</li>
              <li>• Teste o código impresso no tamanho real da aplicação.</li>
              <li>• Evite superfícies muito curvas, brilhantes ou com reflexo.</li>
              <li>• Considere pelo menos 20 × 20 mm para códigos simples.</li>
              <li>• Aumente o tamanho quando houver muito conteúdo ou logotipo.</li>
            </ul>
          </article>
          <article>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Cuidados para o QR Code funcionar corretamente
            </h2>
            <p className="mt-3 text-muted-foreground">
              O código gerado aqui é estático: depois de impresso, o destino não pode ser alterado.
              Confira o conteúdo antes de mandar imprimir uma tiragem. Evite cores claras nos
              módulos, margem zero e logotipos grandes demais. Faça um teste com mais de um celular
              antes de imprimir grandes quantidades.
            </p>
            <p className="mt-3 text-muted-foreground">
              Precisa de material adequado? Veja nosso{" "}
              <Link to="/catalogo" className="underline underline-offset-2 hover:text-foreground">
                catálogo de etiquetas e ribbons
              </Link>{" "}
              ou conheça a{" "}
              <Link to="/etiquetas/preco" className="underline underline-offset-2 hover:text-foreground">
                linha de etiquetas
              </Link>{" "}
              e as{" "}
              <Link to="/ferramentas" className="underline underline-offset-2 hover:text-foreground">
                demais ferramentas gratuitas
              </Link>
              .
            </p>
          </article>
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="FAQ" title="Perguntas frequentes sobre QR Code" />
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="bg-card p-5">
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section tone="muted">
        <div className="rounded-2xl border hairline bg-card p-8 md:p-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Precisa imprimir seu QR Code em etiquetas?
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Na Adeconex, você encontra etiquetas adesivas, ribbons e materiais para identificação,
            organização e impressão profissional.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/etiquetas/preco"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Ver etiquetas <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              to="/ribbon"
              className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              Ver ribbons
            </Link>
            <Link
              to="/contato"
              className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium hover:bg-accent"
            >
              Falar com a Adeconex
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
