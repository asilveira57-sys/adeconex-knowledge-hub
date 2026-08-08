import { Link } from "@tanstack/react-router";
import { ChevronRight, ArrowRight } from "lucide-react";
import { Section, SectionHeader } from "@/components/ui/section";
import { BarcodeGenerator } from "@/components/tools/barcode-generator";
import { SYMBOLOGIES, type SymbologyId } from "@/lib/barcode/symbologies";
import { absoluteUrl } from "@/lib/seo";

export const TOOL_PATH = "/ferramentas/gerador-de-codigo-de-barras";
export const TOOL_URL = absoluteUrl(TOOL_PATH);

export const BARCODE_FAQ: { q: string; a: string }[] = [
  { q: "O gerador de código de barras é gratuito?", a: "Sim. A ferramenta é gratuita, não exige cadastro, login nem e-mail para baixar os arquivos." },
  { q: "Posso usar esses códigos para vender no varejo?", a: "Para vender em supermercados e grandes redes você precisa de um prefixo de empresa licenciado pela GS1 Brasil (789/790). Códigos gerados aqui para uso interno, estoque e logística não precisam de licença." },
  { q: "Meus dados são enviados para algum servidor?", a: "Não. Toda a geração acontece no seu navegador. Nenhum número de produto, lote ou série sai do seu computador." },
  { q: "Qual formato devo pedir para a gráfica?", a: "SVG. É vetorial, com as barras em paths, e abre no Illustrator e no CorelDRAW sem perda de qualidade em nenhuma ampliação." },
  { q: "Qual DPI usar na impressora térmica?", a: "203 dpi atende etiquetas simples; 300 dpi é o padrão para códigos pequenos e textos finos; 600 dpi é indicado para códigos 2D muito reduzidos, como GS1 DataMatrix em medicamentos." },
  { q: "Como calculo o dígito verificador?", a: "O cálculo é automático. Digite 12 dígitos no EAN-13 (ou 7 no EAN-8) e o verificador é somado pelo módulo 10 da GS1. Também validamos o dígito quando você cola o número completo." },
  { q: "Dá para gerar várias etiquetas de uma vez?", a: "Sim. No PDF em folha A4 você escolhe um preset de folha ou define a grade em milímetros, e pode repetir o mesmo código ou gerar uma sequência incremental com verificador recalculado." },
  { q: "Por que o código impresso não é lido?", a: "Na maioria dos casos é quiet zone insuficiente, contraste ruim, impressão abaixo de 203 dpi, ampliação abaixo do mínimo da GS1 ou papel inadequado para o tipo de impressão." },
  { q: "O que é ITF-14 e quando usar?", a: "É o código da caixa máster. Você o gera a partir do EAN-13 do produto somando o indicador de agrupamento (1 a 8). Em papelão ondulado, use bearer bar." },
  { q: "Qual a diferença entre GS1-128 e Code 128?", a: "Code 128 é a simbologia pura, para uso livre. GS1-128 usa a mesma simbologia com regras GS1: FNC1, Application Identifiers e separadores GS, permitindo transmitir lote, validade e quantidade em um único código." },
];

export function BarcodeToolPage({
  symbology,
  heading,
  intro,
  crumb,
}: {
  symbology?: SymbologyId;
  heading: string;
  intro: string;
  crumb?: string;
}) {
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
              {crumb ? (
                <>
                  <li>
                    <Link to={TOOL_PATH} className="hover:text-foreground">Gerador de Código de Barras</Link>
                  </li>
                  <ChevronRight className="h-3 w-3" aria-hidden />
                  <li aria-current="page" className="text-foreground">{crumb}</li>
                </>
              ) : (
                <li aria-current="page" className="text-foreground">Gerador de Código de Barras</li>
              )}
            </ol>
          </nav>
          <p className="eyebrow">Ferramenta gratuita</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight md:text-5xl">
            {heading}
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">{intro}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SYMBOLOGIES.filter((s) => s.slug).map((s) => (
              <Link
                key={s.id}
                to="/ferramentas/gerador-de-codigo-de-barras/$padrao"
                params={{ padrao: s.slug! }}
                className="rounded-full border hairline bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="container-page py-10 md:py-14">
        <h2 className="sr-only">Gere seu código de barras</h2>
        <BarcodeGenerator initialSymbology={symbology ?? "ean13"} />
      </div>

      <Section tone="muted">
        <SectionHeader
          eyebrow="Comparativo"
          title="Qual código de barras usar?"
          description="Cada padrão nasceu para um uso específico. A tabela abaixo resume onde cada um se aplica no Brasil."
        />
        <div className="mt-8 overflow-x-auto rounded-xl border hairline bg-card">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b hairline text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Padrão</th>
                <th className="p-3">Onde se usa no Brasil</th>
                <th className="p-3">Caracteres</th>
                <th className="p-3">Aceita letra?</th>
                <th className="p-3">Tamanho típico</th>
              </tr>
            </thead>
            <tbody className="divide-y hairline">
              {SYMBOLOGIES.map((s) => (
                <tr key={s.id}>
                  <td className="p-3 font-medium">{s.label}</td>
                  <td className="p-3 text-muted-foreground">{s.usage}</td>
                  <td className="p-3 text-muted-foreground">{s.chars}</td>
                  <td className="p-3 text-muted-foreground">{s.acceptsLetters ? "Sim" : "Não"}</td>
                  <td className="p-3 text-muted-foreground">{s.typicalSize}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <article>
            <h2 className="font-display text-2xl font-semibold tracking-tight">EAN-13, GTIN e GS1: qual a diferença?</h2>
            <p className="mt-3 text-muted-foreground">
              GTIN é o número global que identifica um item comercial. EAN-13 é a simbologia — o desenho de
              barras — que representa um GTIN-13. GS1 é a organização que administra a numeração: no Brasil,
              a GS1 Brasil licencia o prefixo de empresa que aparece no começo do número (789 ou 790). Ou seja:
              a empresa recebe um prefixo da GS1, forma o GTIN com ele e imprime esse GTIN como EAN-13.
            </p>
            <h3 className="mt-6 font-display text-lg font-semibold">Como funciona o dígito verificador</h3>
            <p className="mt-3 text-muted-foreground">
              Exemplo com o EAN-13 789123456789<strong>?</strong>: some os dígitos das posições ímpares
              (7+9+2+4+6+8 = 36), some os das pares e multiplique por 3 ((8+1+3+5+7+9) × 3 = 99). O total é 135.
              O verificador é o que falta para a próxima dezena: 140 − 135 = <strong>5</strong>. O código completo
              fica 7891234567895. É exatamente essa conta que o botão “Calcular dígito verificador” faz.
            </p>
          </article>
          <article>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Qual etiqueta usar para cada aplicação</h2>
            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Couché adesivo:</strong> ambiente seco, uso interno, estoque e expedição. Melhor custo, não resiste a umidade nem atrito prolongado.</li>
              <li><strong className="text-foreground">BOPP branco ou transparente:</strong> resiste a água, óleo, freezer e manuseio. Indicado para alimentos, cosméticos, químicos e embalagens que enfrentam umidade.</li>
              <li><strong className="text-foreground">Térmica direta:</strong> impressão sem ribbon, ideal para etiqueta de expedição e balança. Desbota com sol, calor e atrito — evite arquivos de longa duração.</li>
              <li><strong className="text-foreground">Térmica transferida (com ribbon):</strong> impressão durável. Ribbon cera para couché, cera-resina para uso misto e resina para BOPP, freezer, químicos e exposição ao sol.</li>
            </ul>
            <Link to="/catalogo" className="mt-5 inline-flex items-center gap-2 text-sm font-medium underline underline-offset-4">
              Ver catálogo de etiquetas e ribbons <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </article>
        </div>
      </Section>

      <Section tone="muted">
        <SectionHeader eyebrow="Diagnóstico" title="Por que meu código de barras não é lido?" />
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-2 lg:grid-cols-3">
          {[
            ["Quiet zone insuficiente", "A margem clara lateral faz parte do código. Sem ela, o leitor não identifica onde o símbolo começa."],
            ["Contraste ruim", "Barras claras, fundo escuro ou tons de vermelho somem para leitores com luz vermelha. Use preto sobre branco."],
            ["Impressão em baixo DPI", "Abaixo de 203 dpi as barras finas saem irregulares. Códigos pequenos pedem 300 dpi ou mais."],
            ["Ampliação abaixo do mínimo", "Reduzir o código além do X-dimension mínimo da GS1 inviabiliza a leitura, mesmo com impressão perfeita."],
            ["Papel errado", "Térmica direta desbota; couché em ambiente úmido borra. O material precisa combinar com o ambiente de uso."],
            ["Código distorcido", "Esticar só a largura ou a altura quebra a proporção das barras. Redimensione sempre proporcionalmente."],
          ].map(([t, d]) => (
            <div key={t} className="bg-card p-5">
              <h3 className="text-sm font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeader eyebrow="FAQ" title="Perguntas frequentes sobre código de barras" />
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border hairline bg-hairline md:grid-cols-2">
          {BARCODE_FAQ.map((f) => (
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
            Precisa imprimir essas etiquetas?
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A Adeconex fabrica etiquetas em rolo prontas para sua impressora térmica, com o material certo
            para cada ambiente.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/contato" className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">
              Solicite um orçamento <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link to="/etiquetas/preco" className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium hover:bg-accent">
              Ver etiquetas
            </Link>
            <Link to="/ribbon" className="inline-flex items-center gap-2 rounded-md border hairline px-5 py-3 text-sm font-medium hover:bg-accent">
              Ver ribbons
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
