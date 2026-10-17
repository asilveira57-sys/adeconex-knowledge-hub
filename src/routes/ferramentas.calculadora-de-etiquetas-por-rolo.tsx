import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { absoluteUrl } from "@/lib/seo";
import { ToolFaq, faqJsonLd } from "@/components/tools/tool-faq";
import { LABEL_ROLL_FAQ } from "@/content/calculator-faqs";
import { PRINTER_USABLE_WIDTH_MM, RIBBON_PRESETS, widthCheck } from "@/lib/ribbon-calculator";
import { DEFAULT_GAP_MM, labelsForRollLength, rollLengthForLabels } from "@/lib/label-roll-calculator";

const PATH = "/ferramentas/calculadora-de-etiquetas-por-rolo";
const TITLE = "Calculadora de Etiquetas por Rolo e Metragem do Rolo | Adeconex";
const DESCRIPTION =
  "Descubra quantas etiquetas tem um rolo a partir dos metros, ou quantos metros de rolo precisa para sua quantidade. Considera altura, espaçamento de 3 mm e colunas.";

export const Route = createFileRoute("/ferramentas/calculadora-de-etiquetas-por-rolo")({
  head: () => {
    const url = absoluteUrl(PATH);
    return {
      meta: [
        { title: TITLE },
        { name: "description", content: DESCRIPTION },
        { property: "og:title", content: TITLE },
        { property: "og:description", content: DESCRIPTION },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        faqJsonLd(LABEL_ROLL_FAQ),
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Calculadora de Etiquetas por Rolo Adeconex",
            url,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            description: DESCRIPTION,
            offers: { "@type": "Offer", price: 0, priceCurrency: "BRL" },
          }),
        },
      ],
    };
  },
  component: LabelRollPage,
});

const fmt = (n: number, d = 2) => n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

function LabelRollPage() {
  const [mode, setMode] = useState<"metros" | "etiquetas">("etiquetas");
  const [unit, setUnit] = useState<"mm" | "cm">("mm");
  const [height, setHeight] = useState(50);
  const [width, setWidth] = useState(0);
  const [gap, setGap] = useState(DEFAULT_GAP_MM);
  const [columns, setColumns] = useState(1);
  const [quantity, setQuantity] = useState(1000);
  const [meters, setMeters] = useState(50);

  const changeUnit = (u: "mm" | "cm") => {
    if (u === unit) return;
    const f = (v: number) => Math.round((u === "cm" ? v / 10 : v * 10) * 100) / 100;
    setHeight(f);
    setWidth(f);
    setUnit(u);
  };
  const toMm = (v: number) => (unit === "cm" ? v * 10 : v);
  const heightMm = toMm(height);
  const widthMm = toMm(width);
  const cols = Math.max(1, columns);

  const byQty = rollLengthForLabels(heightMm, gap, cols, quantity);
  const byLen = labelsForRollLength(heightMm, gap, cols, meters);
  const wcheck = widthMm > 0 ? widthCheck(widthMm, cols) : null;
  const ribbonQty = mode === "metros" ? quantity : byLen.labels;

  return (
    <>
      <section className="border-b hairline bg-surface-2 py-12 md:py-16">
        <div className="container-page">
          <nav aria-label="Trilha" className="text-xs text-muted-foreground">
            <Link to="/ferramentas" className="hover:text-foreground">Ferramentas</Link> / Etiquetas por rolo
          </nav>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Calculadora de Etiquetas por Rolo
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
            Sabe os metros do rolo e quer saber quantas etiquetas tem? Ou sabe quantas etiquetas precisa e quer saber
            quantos metros de rolo? Informe a altura — o espaçamento de 3 mm entre etiquetas já é somado.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-6 py-10 md:py-14 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4 text-primary" /> Dados da etiqueta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>O que você quer descobrir?</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={mode === "etiquetas" ? "default" : "outline"} onClick={() => setMode("etiquetas")}>
                  Quantas etiquetas tem o rolo
                </Button>
                <Button type="button" size="sm" variant={mode === "metros" ? "default" : "outline"} onClick={() => setMode("metros")}>
                  Quantos metros de rolo preciso
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Modelos prontos</Label>
              <div className="flex flex-wrap gap-2">
                {RIBBON_PRESETS.map((p) => (
                  <Button key={p.label} type="button" size="sm" variant="outline" onClick={() => {
                    setHeight(unit === "cm" ? p.heightMm / 10 : p.heightMm);
                    setWidth(unit === "cm" ? p.widthMm / 10 : p.widthMm);
                    setColumns(p.columns);
                  }}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select value={unit} onValueChange={(v) => changeUnit(v as "mm" | "cm")}>
                <SelectTrigger className="w-32" aria-label="Unidade"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">milímetros</SelectItem>
                  <SelectItem value="cm">centímetros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="er-altura">Altura ({unit})</Label>
                <Input id="er-altura" type="number" inputMode="decimal" min={0} value={height}
                  onChange={(e) => setHeight(num(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-largura">Largura ({unit}, opcional)</Label>
                <Input id="er-largura" type="number" inputMode="decimal" min={0} value={width || ""}
                  onChange={(e) => setWidth(num(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-gap">Espaçamento (mm)</Label>
                <Input id="er-gap" type="number" inputMode="decimal" min={0} value={gap}
                  onChange={(e) => setGap(num(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="er-col">Colunas</Label>
                <Input id="er-col" type="number" inputMode="numeric" min={1} max={10} value={columns}
                  onChange={(e) => setColumns(Math.max(1, Math.round(num(e.target.value))))} />
              </div>
            </div>
            {wcheck && (
              <p className={`text-xs ${wcheck.fits ? "text-muted-foreground" : "text-destructive"}`}>
                Largura ocupada: {fmt(wcheck.totalMm, 1)} mm de {PRINTER_USABLE_WIDTH_MM} mm de boca
                {wcheck.fits ? " — cabe na impressora de 4\"." : " — não cabe na maioria das impressoras."}
              </p>
            )}

            {mode === "metros" ? (
              <div className="space-y-1.5">
                <Label htmlFor="er-qtd">Quantidade de etiquetas</Label>
                <Input id="er-qtd" type="number" inputMode="numeric" min={0} value={quantity}
                  onChange={(e) => setQuantity(Math.round(num(e.target.value)))} />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="er-m">Metros do rolo</Label>
                <Input id="er-m" type="number" inputMode="decimal" min={0} value={meters}
                  onChange={(e) => setMeters(num(e.target.value))} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Resultado</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border hairline bg-surface-1 p-4 text-center">
                {mode === "metros" ? (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Você precisa de um rolo com</p>
                    <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
                      {fmt(byQty.meters)} <span className="text-lg font-normal text-muted-foreground">m</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {quantity.toLocaleString("pt-BR")} etiquetas · {byQty.rows.toLocaleString("pt-BR")} linhas de {fmt(byQty.stepMm, 1)} mm
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Um rolo de {fmt(meters, 1)} m tem cerca de</p>
                    <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
                      {byLen.labels.toLocaleString("pt-BR")} <span className="text-lg font-normal text-muted-foreground">etiquetas</span>
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {byLen.rows.toLocaleString("pt-BR")} linhas de {fmt(byLen.stepMm, 1)} mm × {cols} coluna(s)
                    </p>
                  </>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Cálculo: (altura + {fmt(gap, 1)} mm de espaçamento) × linhas. Valor estimado; o tubete e a ponta inicial não entram na conta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">Quanto ribbon essa tiragem consome?</p>
                <p className="text-sm text-muted-foreground">Calcule com as mesmas medidas na calculadora de ribbon.</p>
              </div>
              <Button asChild>
                <Link to="/ferramentas/calculadora-de-ribbon"
                  search={{ altura: heightMm, colunas: cols, quantidade: ribbonQty, largura: widthMm || undefined }}>
                  Calcular ribbon <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      <ToolFaq items={LABEL_ROLL_FAQ} />
    </>
  );
}
