import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RollPreview } from "@/components/aleprint/roll-preview";
import { RollResultPanel } from "@/components/aleprint/roll-result-panel";
import { calculateRollLayout, type RollInput } from "@/lib/aleprint/roll-calculator";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/ferramentas/planejador-de-bobina";
const TITLE = "Planejador de Corte em Bobina — Rendimento de Etiquetas | Adeconex";
const DESCRIPTION =
  "Calcule quantas etiquetas saem de uma bobina: itens por linha, metros consumidos, sobra do rolo e aproveitamento real do material. Grátis e direto no navegador.";

export const Route = createFileRoute("/ferramentas/planejador-de-bobina")({
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
            name: "Planejador de Corte em Bobina Adeconex",
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
  component: RollPlannerPage,
});

const MATERIALS = [
  "Papel couché adesivo",
  "Papel térmico",
  "BOPP branco",
  "BOPP transparente",
  "Tag / papel cartão",
  "Fita de cetim",
];

const WIDTH_PRESETS = [50, 80, 100, 107, 150, 200, 250];

function NumField({
  id,
  label,
  value,
  onChange,
  min = 0,
  suffix,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  suffix?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {suffix && <span className="text-muted-foreground">({suffix})</span>}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      />
    </div>
  );
}

function RollPlannerPage() {
  const [rollWidth, setRollWidth] = useState(107);
  const [rollLength, setRollLength] = useState(300);
  const [materialType, setMaterialType] = useState(MATERIALS[0]);
  const [outputWidth, setOutputWidth] = useState(50);
  const [outputHeight, setOutputHeight] = useState(30);
  const [lateralMargin, setLateralMargin] = useState(3);
  const [lateralWaste, setLateralWaste] = useState(0);
  const [spacing, setSpacing] = useState(3);
  const [orientation, setOrientation] = useState<RollInput["orientation"]>("auto");

  const input: RollInput = useMemo(
    () => ({
      rollWidth,
      rollLength,
      materialType,
      outputWidth,
      outputHeight,
      lateralMargin,
      lateralWaste,
      spacing,
      orientation,
    }),
    [
      rollWidth,
      rollLength,
      materialType,
      outputWidth,
      outputHeight,
      lateralMargin,
      lateralWaste,
      spacing,
      orientation,
    ],
  );

  const result = useMemo(() => calculateRollLayout(input), [input]);

  return (
    <>
      <section className="border-b hairline bg-surface-2 py-12 md:py-16">
        <div className="container-page">
          <nav aria-label="Trilha" className="text-xs text-muted-foreground">
            <Link to="/ferramentas" className="hover:text-foreground">
              Ferramentas
            </Link>{" "}
            / Planejador de bobina
          </nav>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Planejador de Corte em Bobina
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
            Informe a largura e o comprimento da bobina e as medidas da etiqueta para saber quantas peças saem do
            rolo, quantos metros serão consumidos e qual o aproveitamento real do material.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-6 py-10 md:py-14 lg:grid-cols-[320px_1fr_260px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Bobina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {WIDTH_PRESETS.map((w) => (
                  <Button
                    key={w}
                    type="button"
                    size="sm"
                    variant={rollWidth === w ? "default" : "outline"}
                    onClick={() => setRollWidth(w)}
                  >
                    {w}mm
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumField id="roll-w" label="Largura" suffix="mm" value={rollWidth} onChange={setRollWidth} min={1} />
                <NumField
                  id="roll-l"
                  label="Comprimento"
                  suffix="m"
                  value={rollLength}
                  onChange={setRollLength}
                  min={1}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Material</Label>
                <Select value={materialType} onValueChange={setMaterialType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIALS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Etiqueta (mm)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <NumField id="out-w" label="Largura" value={outputWidth} onChange={setOutputWidth} min={1} />
                <NumField id="out-h" label="Altura" value={outputHeight} onChange={setOutputHeight} min={1} />
              </div>
              <div className="space-y-1.5">
                <Label>Orientação</Label>
                <Select
                  value={orientation}
                  onValueChange={(v) => setOrientation(v as RollInput["orientation"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Automática (melhor aproveitamento)</SelectItem>
                    <SelectItem value="normal">Padrão</SelectItem>
                    <SelectItem value="rotacionado">Rotacionada 90°</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Produção (mm)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3">
              <NumField id="lat-margin" label="Margem" value={lateralMargin} onChange={setLateralMargin} />
              <NumField id="lat-waste" label="Perda" value={lateralWaste} onChange={setLateralWaste} />
              <NumField id="roll-spacing" label="Espaço" value={spacing} onChange={setSpacing} />
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <RollPreview input={input} result={result} />
          </CardContent>
        </Card>

        <RollResultPanel result={result} />
      </div>

      <div className="container-page pb-16">
        <div className="flex flex-wrap gap-3">
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
