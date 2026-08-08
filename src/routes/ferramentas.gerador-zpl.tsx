import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { ZplGenerator } from "@/components/tools/zpl-generator";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/ferramentas/gerador-zpl";
const URL = absoluteUrl(PATH);
const TITLE = "Gerador e Visualizador de ZPL Online Grátis | Adeconex";
const DESCRIPTION =
  "Escreva, visualize e imprima etiquetas ZPL online. Pré-visualização em tempo real, modelos prontos, 203/300/600 dpi e download em PNG, PDF e .zpl.";

const FAQ: { q: string; a: string }[] = [
  { q: "O que é ZPL?", a: "ZPL (Zebra Programming Language) é a linguagem de comandos usada pelas impressoras térmicas Zebra e compatíveis. Cada etiqueta é um bloco de texto que começa com ^XA e termina com ^XZ." },
  { q: "A ferramenta é gratuita?", a: "Sim. Não há cadastro, login nem limite de downloads para visualizar e exportar suas etiquetas." },
  { q: "Como escolho a resolução correta?", a: "8 dpmm equivale a 203 dpi, resolução da maioria das impressoras de mesa. 12 dpmm é 300 dpi, indicado para textos pequenos e códigos 2D. 24 dpmm é 600 dpi, usado em aplicações industriais de alta precisão." },
  { q: "Posso imprimir direto na minha impressora?", a: "Sim. Baixe o arquivo .zpl e envie para a impressora pela porta USB/rede, ou imprima o PDF em escala 100% em uma impressora comum." },
  { q: "Consigo visualizar várias etiquetas de um mesmo arquivo?", a: "Sim. Quando o ZPL contém vários blocos ^XA...^XZ, a ferramenta permite navegar entre as etiquetas geradas." },
  { q: "Por que o texto com acento aparece errado?", a: "Inclua o comando ^CI28 logo após o ^XA para ativar a codificação UTF-8 e imprimir acentuação corretamente." },
  { q: "Como definir o tamanho da etiqueta?", a: "Informe largura e altura em milímetros no painel. No ZPL, use ^PW para a largura em pontos e ^LL para o comprimento — ambos dependem da resolução escolhida." },
  { q: "Meus dados ficam salvos?", a: "Não. O ZPL é enviado apenas para renderização e não é armazenado. Ainda assim, evite incluir dados sensíveis em testes." },
  { q: "Qual etiqueta usar para impressão térmica?", a: "Térmica direta para uso curto (balança, envio); térmica transferida com ribbon para durabilidade, resistência a atrito, umidade e freezer. A Adeconex fabrica os dois formatos em rolo." },
  { q: "Quem faz a renderização das etiquetas?", a: "A pré-visualização usa a API pública da Labelary, referência de mercado na interpretação de ZPL, garantindo fidelidade ao que a impressora Zebra produz." },
];

export const Route = createFileRoute("/ferramentas/gerador-zpl")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "Gerador e Visualizador de ZPL",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          url: URL,
          offers: { "@type": "Offer", price: 0, priceCurrency: "BRL" },
          publisher: { "@type": "Organization", name: "Adeconex Etiquetas" },
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
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Início", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Ferramentas", item: absoluteUrl("/ferramentas") },
            { "@type": "ListItem", position: 3, name: "Gerador de ZPL", item: URL },
          ],
        }),
      },
    ],
  }),
  component: ZplToolPage,
});

const COMMANDS: { cmd: string; desc: string }[] = [
  { cmd: "^XA / ^XZ", desc: "Abre e fecha o formato da etiqueta. Todo ZPL vive entre esses dois comandos." },
  { cmd: "^CI28", desc: "Ativa UTF-8 e garante acentuação correta em português." },
  { cmd: "^PW / ^LL", desc: "Largura de impressão e comprimento da etiqueta, em pontos (dots)." },
  { cmd: "^FO x,y", desc: "Posiciona o próximo campo nas coordenadas informadas." },
  { cmd: "^A0N,alt,larg", desc: "Define fonte escalável, altura e largura do texto." },
  { cmd: "^FD ... ^FS", desc: "Conteúdo do campo e fim do campo." },
  { cmd: "^BY", desc: "Largura do módulo e proporção das barras." },
  { cmd: "^BCN", desc: "Código de barras Code 128 na horizontal." },
  { cmd: "^BQN,2,7", desc: "QR Code, com fator de ampliação 7." },
  { cmd: "^GB l,a,esp", desc: "Desenha caixas e linhas para separar blocos." },
  { cmd: "^PQ n", desc: "Quantidade de cópias a imprimir." },
];

function ZplToolPage() {
  return (
    <>
      <section className="border-b hairline bg-surface-2">
        <div className="container-page py-12 md:py-16">
          <nav aria-label="Trilha de navegação" className="mb-6">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <li><Link to="/" className="hover:text-foreground">Início</Link></li>
              <ChevronRight className="h-3 w-3" aria-hidden />
              <li><Link to="/ferramentas" className="hover:text-foreground">Ferramentas</Link></li>
              <ChevronRight className="h-3 w-3" aria-hidden />
              <li aria-current="page" className="text-foreground">Gerador de ZPL</li>
            </ol>
          </nav>
          <p className="eyebrow">Ferramenta gratuita</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
            Gerador e visualizador de ZPL online
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
            Escreva ou cole seu código ZPL, veja a etiqueta renderizada em tempo real como a impressora
            Zebra imprimiria e baixe em PNG, PDF ou arquivo .zpl pronto para envio à impressora.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              to="/ferramentas/gerador-de-codigo-de-barras"
              className="rounded-full border hairline bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Gerador de Código de Barras
            </Link>
            <Link
              to="/gerador-qrcode"
              className="rounded-full border hairline bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Gerador de QR Code
            </Link>
          </div>
        </div>
      </section>

      <div className="container-page py-10 md:py-14">
        <h2 className="sr-only">Editor de ZPL</h2>
        <ZplGenerator />
      </div>

      <Section tone="muted">
        <SectionHeader
          eyebrow="Referência rápida"
          title="Principais comandos ZPL"
          description="Os comandos que resolvem 90% das etiquetas do dia a dia em impressão térmica."
        />
        <div className="mt-8 overflow-x-auto rounded-xl border hairline bg-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b hairline text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Comando</th>
                <th className="p-3">O que faz</th>
              </tr>
            </thead>
            <tbody className="divide-y hairline">
              {COMMANDS.map((c) => (
                <tr key={c.cmd}>
                  <td className="p-3 font-mono text-xs font-medium">{c.cmd}</td>
                  <td className="p-3 text-muted-foreground">{c.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <article>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Como testar o ZPL antes de gastar etiqueta
            </h2>
            <p className="mt-3 text-muted-foreground">
              Todo ajuste de posição, fonte ou código de barras pode ser validado aqui na tela. Escolha
              a resolução real da sua impressora (203, 300 ou 600 dpi) e o tamanho exato do rolo. O que
              aparece na pré-visualização é o que sai impresso — inclusive cortes por transbordo de
              margem, que são a causa mais comum de retrabalho.
            </p>
            <p className="mt-3 text-muted-foreground">
              Depois de aprovar, baixe o arquivo .zpl e envie direto para a impressora, ou use o PDF
              para aprovação interna com o cliente.
            </p>
          </article>
          <article>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Qual etiqueta usar em cada aplicação
            </h2>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Térmica direta:</strong> envios, balança e uso de curta duração, sem ribbon.</li>
              <li><strong className="text-foreground">Térmica transferida (couché):</strong> uso interno e estoque, com ribbon cera.</li>
              <li><strong className="text-foreground">BOPP:</strong> umidade, freezer, químicos e produtos com manuseio intenso, com ribbon resina.</li>
              <li><strong className="text-foreground">Tag / papel cartão:</strong> identificação suspensa e gôndola, sem adesivo.</li>
            </ul>
            <Link
              to="/contato"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
            >
              Solicitar orçamento de etiquetas
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeader eyebrow="Dúvidas frequentes" title="Perguntas sobre ZPL e impressão térmica" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border hairline bg-card p-5">
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
