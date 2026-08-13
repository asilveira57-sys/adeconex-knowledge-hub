import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightLeft, Ruler } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/ferramentas/conversor-de-medidas";
const TITLE = "Conversor de Medidas Gráficas (mm, cm, m, polegadas) | Adeconex";
const DESCRIPTION =
  "Converta milímetros, centímetros, metros e polegadas na hora e consulte as medidas da série A (A0 a A10) em mm, cm e polegadas. Grátis, sem cadastro.";

export const Route = createFileRoute("/ferramentas/conversor-de-medidas")({
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
            name: "Conversor de Medidas Gráficas Adeconex",
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
  component: ConversorPage,
});

const UNITS = [
  { value: "mm", label: "Milímetros (mm)", factor: 1 },
  { value: "cm", label: "Centímetros (cm)", factor: 10 },
  { value: "m", label: "Metros (m)", factor: 1000 },
  { value: "in", label: "Polegadas (in)", factor: 25.4 },
];

const PAPER_FORMATS = [
  { name: "A0", w: 841, h: 1189 },
  { name: "A1", w: 594, h: 841 },
  { name: "A2", w: 420, h: 594 },
  { name: "A3", w: 297, h: 420 },
  { name: "A3+", w: 329, h: 483 },
  { name: "Super A3", w: 330, h: 480 },
  { name: "A4", w: 210, h: 297 },
  { name: "A5", w: 148, h: 210 },
  { name: "A6", w: 105, h: 148 },
  { name: "A7", w: 74, h: 105 },
  { name: "A8", w: 52, h: 74 },
  { name: "A9", w: 37, h: 52 },
  { name: "A10", w: 26, h: 37 },
];

function ConversorPage() {
  const [value, setValue] = useState(210);
  const [fromUnit, setFromUnit] = useState("mm");
  const [toUnit, setToUnit] = useState("cm");

  const converted = useMemo(() => {
    const from = UNITS.find((u) => u.value === fromUnit)!;
    const to = UNITS.find((u) => u.value === toUnit)!;
    const mm = value * from.factor;
    return Math.round((mm / to.factor) * 10000) / 10000;
  }, [value, fromUnit, toUnit]);

  const swap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
    setValue(converted);
  };

  const inUnit = (mm: number, unit: string) => {
    const u = UNITS.find((x) => x.value === unit)!;
    return (mm / u.factor).toFixed(unit === "m" ? 4 : 2);
  };

  return (
    <>
      <section className="border-b hairline bg-surface-2 py-12 md:py-16">
        <div className="container-page">
          <nav aria-label="Trilha" className="text-xs text-muted-foreground">
            <Link to="/ferramentas" className="hover:text-foreground">
              Ferramentas
            </Link>{" "}
            / Conversor de medidas
          </nav>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Conversor de Medidas Gráficas
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
            Converta milímetros, centímetros, metros e polegadas e consulte rapidamente as medidas da série A.
            Tudo roda no seu navegador, sem cadastro.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-6 py-10 md:py-14 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4 text-primary" /> Conversão de unidades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="conv-valor">Valor</Label>
                <Input
                  id="conv-valor"
                  type="number"
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => setValue(Number(e.target.value) || 0)}
                />
                <Select value={fromUnit} onValueChange={setFromUnit}>
                  <SelectTrigger aria-label="Unidade de origem">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="icon" onClick={swap} aria-label="Inverter unidades" className="mb-1">
                <ArrowRightLeft className="h-4 w-4" />
              </Button>

              <div className="space-y-1.5">
                <Label>Resultado</Label>
                <div className="flex h-9 items-center rounded-md border hairline bg-surface-1 px-3 text-sm font-semibold tabular-nums">
                  {converted}
                </div>
                <Select value={toUnit} onValueChange={setToUnit}>
                  <SelectTrigger aria-label="Unidade de destino">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {UNITS.map((u) => (
                <div key={u.value} className="rounded-md bg-muted/50 p-2 text-center">
                  <p className="text-sm font-semibold tabular-nums">
                    {inUnit(value * UNITS.find((x) => x.value === fromUnit)!.factor, u.value)}
                  </p>
                  <p className="text-xs text-muted-foreground">{u.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formatos da série A</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b hairline text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Formato</th>
                  <th className="py-2">mm</th>
                  <th className="py-2">cm</th>
                  <th className="py-2">polegadas</th>
                </tr>
              </thead>
              <tbody className="divide-y hairline">
                {PAPER_FORMATS.map((f) => (
                  <tr key={f.name}>
                    <td className="py-2 font-medium">{f.name}</td>
                    <td className="py-2 tabular-nums text-muted-foreground">
                      {f.w} × {f.h}
                    </td>
                    <td className="py-2 tabular-nums text-muted-foreground">
                      {(f.w / 10).toFixed(1)} × {(f.h / 10).toFixed(1)}
                    </td>
                    <td className="py-2 tabular-nums text-muted-foreground">
                      {(f.w / 25.4).toFixed(2)} × {(f.h / 25.4).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <div className="container-page pb-16">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/ferramentas/planejador-de-folha">Planejador de folha</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/ferramentas/planejador-de-bobina">Planejador de bobina</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
