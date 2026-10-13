import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/ferramentas/calculadora-de-ribbon";
const TITLE = "Calculadora de Consumo de Ribbon — Metragem por Quantidade de Etiquetas | Adeconex";
const DESCRIPTION =
  "Informe a altura da etiqueta e a quantidade a imprimir e saiba quantos metros de ribbon você vai consumir. Considera o espaçamento de 3 mm entre etiquetas. Grátis e direto no navegador.";

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

const SPACING_MM = 3;

const RIBBON_ROLLS = [74, 90, 300, 450];

const fmt = (n: number, digits = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function RibbonCalculatorPage() {
  const [height, setHeight] = useState(50);
  const [unit, setUnit] = useState<"mm" | "cm">("mm");
  const [quantity, setQuantity] = useState(1000);

  const { stepMm, totalMm } = useMemo(() => {
    const baseMm = unit === "cm" ? height * 10 : height;
    const step = Math.max(0, baseMm) + SPACING_MM;
    return { stepMm: step, totalMm: step * Math.max(0, quantity) };
  }, [height, unit, quantity]);

  const totalM = totalMm / 1000;
  const stepCm = stepMm / 10;

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
            Informe a altura da etiqueta e a quantidade a imprimir para saber quantos metros de ribbon a impressão vai
            consumir. O cálculo considera automaticamente 3 mm de espaçamento entre etiquetas.
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
            <div className="grid grid-cols-[1fr_auto] items-end gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ribbon-altura">Altura da etiqueta</Label>
                <Input
                  id="ribbon-altura"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={height}
                  onChange={(e) => setHeight(Math.max(0, Number(e.target.value.replace(",", ".")) || 0))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Ex.: 50 em milímetros ou 5 em centímetros — o espaçamento de 3 mm é somado automaticamente.
                </p>
              </div>
              <Select value={unit} onValueChange={(v) => setUnit(v as "mm" | "cm")}>
                <SelectTrigger className="w-28" aria-label="Unidade da altura">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mm">mm</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ribbon-qtd">Quantidade de etiquetas</Label>
              <Input
                id="ribbon-qtd"
                type="number"
                inputMode="numeric"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Math.round(Number(e.target.value) || 0)))}
              />
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="font-medium">Como o cálculo é feito</p>
              <p className="mt-1 text-muted-foreground">
                Altura informada ({fmt(height)} {unit}) + 3 mm de espaçamento ={" "}
                <strong className="text-foreground">
                  {unit === "mm" ? `${fmt(stepMm)} mm` : `${fmt(stepCm)} cm`}
                </strong>{" "}
                por etiqueta. Multiplicado pelas {quantity.toLocaleString("pt-BR")} etiquetas, dá o consumo total de
                ribbon.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Consumo de ribbon</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border hairline bg-surface-1 p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Consumo total</p>
                <p className="mt-1 font-display text-4xl font-semibold tabular-nums">
                  {fmt(totalM)} <span className="text-lg font-normal text-muted-foreground">m</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  equivale a {fmt(totalMm / 10, 1)} cm ({totalMm.toLocaleString("pt-BR")} mm) de ribbon
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Passo por etiqueta</p>
                  <p className="mt-0.5 font-semibold tabular-nums">
                    {unit === "mm" ? `${fmt(stepMm)} mm` : `${fmt(stepCm)} cm`}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Etiquetas</p>
                  <p className="mt-0.5 font-semibold tabular-nums">{quantity.toLocaleString("pt-BR")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Rolos necessários</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full text-left text-sm">
                <thead className="border-b hairline text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2">Rolo</th>
                    <th className="py-2">Quantidade</th>
                    <th className="py-2 text-right">Metros comprados</th>
                  </tr>
                </thead>
                <tbody className="divide-y hairline">
                  {RIBBON_ROLLS.map((roll) => {
                    const rolls = totalM > 0 ? Math.ceil(totalM / roll) : 0;
                    return (
                      <tr key={roll}>
                        <td className="py-2 font-medium">{roll} m</td>
                        <td className="py-2 tabular-nums text-muted-foreground">
                          {rolls} {rolls === 1 ? "rolo" : "rolos"}
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {fmt(rolls * roll, 0)} m
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Quantidades inteiras de rolos — o ribbon não vem parcial. Comprar sempre um pouco acima do consumo
                evita trocar o rolo no meio da tiragem.
              </p>
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
