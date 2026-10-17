import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { absoluteUrl } from "@/lib/seo";
import {
  PRINTER_USABLE_WIDTH_MM,
  RIBBON_PRESETS,
  RIBBON_ROLLS_M,
  ribbonConsumption,
  rollYield,
  widthCheck,
  labelsInRollLength,
} from "@/lib/ribbon-calculator";

const PATH = "/ferramentas/calculadora-de-ribbon";
const TITLE = "Calculadora de Consumo de Ribbon — Metragem e Rendimento por Rolo | Adeconex";
const DESCRIPTION =
  "Calcule quantos metros de ribbon sua impressão consome considerando altura, colunas e 3 mm de espaçamento. Veja o rendimento e a sobra em rolos de 74, 90, 300 e 450 m.";

export const Route = createFileRoute("/ferramentas/calculadora-de-ribbon")({
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
        { name: "twitter:title", content: TITLE },
        { name: "twitter:description", content: DESCRIPTION },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Calculadora de Consumo de Ribbon Adeconex",
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
  component: RibbonCalculatorPage,
});

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const num = (v: string) => Math.max(0, Number(v.replace(",", ".")) || 0);

function RibbonCalculatorPage() {
  const [height, setHeight] = useState(50);
  const [unit, setUnit] = useState<"mm" | "cm">("mm");
  const [quantity, setQuantity] = useState(1000);
  const [columns, setColumns] = useState(1);
  const [width, setWidth] = useState(0);
  const [rollMode, setRollMode] = useState<"qtd" | "metros">("qtd");
  const [rollInput, setRollInput] = useState(0);
  const [safety, setSafety] = useState(0);

  const changeUnit = (u: "mm" | "cm") => {
    if (u === unit) return;
    setHeight((h) => Math.round((u === "cm" ? h / 10 : h * 10) * 100) / 100);
    setWidth((w) => Math.round((u === "cm" ? w / 10 : w * 10) * 100) / 100);
    setUnit(u);
  };

  const toMm = (v: number) => (unit === "cm" ? v * 10 : v);
  const heightMm = toMm(height);
  const widthMm = toMm(width);

  const calc = useMemo(
    () => ribbonConsumption({ heightMm, quantity, columns, safetyPercent: safety }),
    [heightMm, quantity, columns, safety],
  );
  const perLabelRoll =
    rollMode === "qtd" ? Math.round(rollInput) : labelsInRollLength(rollInput, calc.stepMm, calc.columns);
  const wcheck = widthMm > 0 ? widthCheck(widthMm, calc.columns) : null;
  const showStep = unit === "mm" ? `${fmt(calc.stepMm)} mm` : `${fmt(calc.stepMm / 10)} cm`;

  const applyPreset = (p: (typeof RIBBON_PRESETS)[number]) => {
    setHeight(unit === "cm" ? p.heightMm / 10 : p.heightMm);
    setWidth(unit === "cm" ? p.widthMm / 10 : p.widthMm);
    setColumns(p.columns);
  };

  return (
    <>
      <section className="border-b hairline bg-surface-2 py-12 md:py-16">
        <div className="container-page">
          <nav aria-label="Trilha" className="text-xs text-muted-foreground">
            <Link to="/ferramentas" className="hover:text-foreground">
              Ferramentas
            </Link>{" "}
            / Calculadora de ribbon
          </nav>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Calculadora de Consumo de Ribbon
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
            Informe a altura da etiqueta, a quantidade e o número de colunas para saber quantos metros de ribbon a
            impressão consome e quanto rende cada rolo. O cálculo soma 3 mm de espaçamento entre etiquetas.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-6 py-10 md:py-14 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Printer className="h-4 w-4 text-primary" /> Dados da impressão
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Modelos prontos</Label>
              <div className="flex flex-wrap gap-2">
                {RIBBON_PRESETS.map((p) => (
                  <Button key={p.label} type="button" size="sm" variant="outline" onClick={() => applyPreset(p)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Unidade</Label>
              <Select value={unit} onValueChange={(v) => changeUnit(v as "mm" | "cm")}>
                <SelectTrigger className="w-32" aria-label="Unidade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">milímetros</SelectItem>
                  <SelectItem value="cm">centímetros</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Ao trocar, os valores são convertidos (50 mm = 5 cm).</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ribbon-altura">Altura da etiqueta ({unit})</Label>
                <Input id="ribbon-altura" type="number" inputMode="decimal" min={0} value={height}
                  onChange={(e) => setHeight(num(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ribbon-largura">Largura ({unit}, opcional)</Label>
                <Input id="ribbon-largura" type="number" inputMode="decimal" min={0} value={width || ""}
                  onChange={(e) => setWidth(num(e.target.value))} />
              </div>
            </div>
            {heightMm > 200 && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> Etiqueta incomum (acima de 20 cm) — confira a unidade.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ribbon-qtd">Quantidade de etiquetas</Label>
                <Input id="ribbon-qtd" type="number" inputMode="numeric" min={0} value={quantity}
                  onChange={(e) => setQuantity(Math.round(num(e.target.value)))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ribbon-col">Colunas</Label>
                <Input id="ribbon-col" type="number" inputMode="numeric" min={1} max={10} value={columns}
                  onChange={(e) => setColumns(Math.max(1, Math.round(num(e.target.value))))} />
              </div>
            </div>
            {wcheck ? (
              <p className={`text-xs ${wcheck.fits ? "text-muted-foreground" : "text-destructive"}`}>
                Largura ocupada: {fmt(wcheck.totalMm, 1)} mm (etiquetas + 3 mm entre colunas + 1,5 mm em cada borda) de{" "}
                {PRINTER_USABLE_WIDTH_MM} mm de boca
                {wcheck.fits ? " — cabe na impressora de 4\"." : " — não cabe na maioria das impressoras."}
              </p>
            ) : (
              <p className={`text-xs ${columns > 4 ? "text-destructive" : "text-muted-foreground"}`}>
                A maioria das impressoras tem 109 mm de boca — informe a largura ou confirme que as colunas cabem.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Select value={rollMode} onValueChange={(v) => setRollMode(v as "qtd" | "metros")}>
                  <SelectTrigger className="h-7 w-auto border-none px-0 text-sm font-medium shadow-none" aria-label="Rolo de etiqueta">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="qtd">Etiquetas por rolo</SelectItem>
                    <SelectItem value="metros">Metros do rolo de etiqueta</SelectItem>
                  </SelectContent>
                </Select>
                <Input id="ribbon-rolo" type="number" inputMode="decimal" min={0} value={rollInput || ""}
                  placeholder={rollMode === "qtd" ? "ex.: 1000" : "ex.: 50"} aria-label="Rolo de etiqueta"
                  onChange={(e) => setRollInput(num(e.target.value))} />
                {rollMode === "metros" && rollInput > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Um rolo de {fmt(rollInput, 1)} m tem cerca de{" "}
                    <strong className="text-foreground">{perLabelRoll.toLocaleString("pt-BR")} etiquetas</strong>.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Margem de segurança</Label>
                <Select value={String(safety)} onValueChange={(v) => setSafety(Number(v))}>
                  <SelectTrigger aria-label="Margem de segurança"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Sem margem</SelectItem>
                    <SelectItem value="5">+5%</SelectItem>
                    <SelectItem value="10">+10%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Como o cálculo é feito</p>
              ({fmt(height)} {unit} + 3 mm) = <strong className="text-foreground">{showStep}</strong> por etiqueta ×{" "}
              {quantity.toLocaleString("pt-BR")} etiquetas ÷ {calc.columns} coluna(s)
              {safety > 0 ? ` + ${safety}%` : ""}.
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Consumo de ribbon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border hairline bg-surface-1 p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Você vai utilizar</p>
                <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
                  {fmt(calc.totalM)} <span className="text-lg font-normal text-muted-foreground">m</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  de ribbon, fora desperdício de calibração e emendas · {calc.rowsNeeded.toLocaleString("pt-BR")}{" "}
                  avanços de {showStep}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rendimento por rolo de ribbon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {RIBBON_ROLLS_M.map((roll) => {
                const y = rollYield(roll, calc.totalM, calc.stepMm, calc.columns, perLabelRoll);
                return (
                  <div key={roll} className="rounded-md border hairline p-3 text-sm">
                    <p className="font-semibold">Ribbon de {roll} m</p>
                    <ul className="mt-1 space-y-0.5 text-muted-foreground">
                      <li>
                        {y.leftoverM >= 0 ? (
                          <>Esta tiragem usa {fmt(calc.totalM)} m e <strong className="text-foreground">sobram {fmt(y.leftoverM)} m</strong>.</>
                        ) : (
                          <>Não basta: precisa de <strong className="text-foreground">{y.rollsNeeded} rolos</strong> ({fmt(-y.leftoverM)} m a mais que um rolo).</>
                        )}
                      </li>
                      <li>Rende {fmt(y.runs)} tiragens iguais a esta.</li>
                      <li>Imprime cerca de {y.labelsPerRibbon.toLocaleString("pt-BR")} etiquetas deste tamanho.</li>
                      {y.labelRolls !== null && (
                        <li>
                          Equivale a {fmt(y.labelRolls, 1)} rolos de {perLabelRoll.toLocaleString("pt-BR")} etiquetas.
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="container-page pb-16">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/ferramentas/planejador-de-bobina">Planejador de bobina</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/ferramentas/planejador-de-folha">Planejador de folha</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/ferramentas/conversor-de-medidas">Conversor de medidas</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
