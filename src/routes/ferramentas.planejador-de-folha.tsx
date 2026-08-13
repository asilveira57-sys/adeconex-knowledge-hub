import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Circle, RectangleHorizontal, Square, Triangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SheetPreview } from "@/components/aleprint/sheet-preview";
import { SheetResultPanel } from "@/components/aleprint/sheet-result-panel";
import { calculateSheetLayout, type SheetInput } from "@/lib/aleprint/sheet-calculator";
import { absoluteUrl } from "@/lib/seo";

const PATH = "/ferramentas/planejador-de-folha";
const TITLE = "Planejador de Corte em Folha — Quantas Etiquetas Cabem | Adeconex";
const DESCRIPTION =
  "Calcule quantas peças cabem em uma folha A4, A3 ou personalizada considerando sangria, espaçamento e margem. Preview visual da grade e aproveitamento em tempo real.";

export const Route = createFileRoute("/ferramentas/planejador-de-folha")({
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
            name: "Planejador de Corte em Folha Adeconex",
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
  component: SheetPlannerPage,
});

const PAPER_PRESETS = [
  { name: "A4", w: 210, h: 297 },
  { name: "A3", w: 297, h: 420 },
  { name: "A3+", w: 329, h: 483 },
  { name: "Super A3", w: 330, h: 480 },
  { name: "A5", w: 148, h: 210 },
  { name: "A2", w: 420, h: 594 },
];

const SHAPES = [
  { value: "retangulo" as const, label: "Retângulo", icon: RectangleHorizontal },
  { value: "quadrado" as const, label: "Quadrado", icon: Square },
  { value: "circulo" as const, label: "Círculo", icon: Circle },
  { value: "triangulo" as const, label: "Triângulo", icon: Triangle },
];

function NumField({
  id,
  label,
  value,
  onChange,
  min = 0,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
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

function SheetPlannerPage() {
  const [sheetWidth, setSheetWidth] = useState(210);
  const [sheetHeight, setSheetHeight] = useState(297);
  const [shapeType, setShapeType] = useState<SheetInput["shapeType"]>("retangulo");
  const [pieceWidth, setPieceWidth] = useState(50);
  const [pieceHeight, setPieceHeight] = useState(30);
  const [bleed, setBleed] = useState(2);
  const [spacing, setSpacing] = useState(2);
  const [margin, setMargin] = useState(5);
  const [allowRotation, setAllowRotation] = useState(false);
  const [includeBleed, setIncludeBleed] = useState(true);
  const [interlockTriangles, setInterlockTriangles] = useState(true);

  const input: SheetInput = useMemo(
    () => ({
      sheetWidth,
      sheetHeight,
      pieceWidth,
      pieceHeight: shapeType === "quadrado" ? pieceWidth : pieceHeight,
      bleed,
      spacing,
      margin,
      allowRotation,
      includeBleed,
      shapeType,
      interlockTriangles,
    }),
    [
      sheetWidth,
      sheetHeight,
      pieceWidth,
      pieceHeight,
      bleed,
      spacing,
      margin,
      allowRotation,
      includeBleed,
      shapeType,
      interlockTriangles,
    ],
  );

  const result = useMemo(() => calculateSheetLayout(input), [input]);

  return (
    <>
      <section className="border-b hairline bg-surface-2 py-12 md:py-16">
        <div className="container-page">
          <nav aria-label="Trilha" className="text-xs text-muted-foreground">
            <Link to="/ferramentas" className="hover:text-foreground">
              Ferramentas
            </Link>{" "}
            / Planejador de folha
          </nav>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
            Planejador de Corte em Folha
          </h1>
          <p className="mt-4 max-w-3xl text-muted-foreground md:text-lg">
            Descubra quantas etiquetas, tags ou cartões cabem em cada folha considerando sangria, espaçamento e
            margem de segurança. O cálculo não cobra espaçamento depois da última peça — o mesmo critério usado
            na produção real.
          </p>
        </div>
      </section>

      <div className="container-page grid gap-6 py-10 md:py-14 lg:grid-cols-[320px_1fr_260px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Folha (mm)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {PAPER_PRESETS.map((p) => (
                  <Button
                    key={p.name}
                    type="button"
                    size="sm"
                    variant={sheetWidth === p.w && sheetHeight === p.h ? "default" : "outline"}
                    onClick={() => {
                      setSheetWidth(p.w);
                      setSheetHeight(p.h);
                    }}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumField id="sheet-w" label="Largura" value={sheetWidth} onChange={setSheetWidth} min={1} />
                <NumField id="sheet-h" label="Altura" value={sheetHeight} onChange={setSheetHeight} min={1} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Peça (mm)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {SHAPES.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Button
                      key={s.value}
                      type="button"
                      size="sm"
                      variant={shapeType === s.value ? "default" : "outline"}
                      onClick={() => setShapeType(s.value)}
                    >
                      <Icon className="h-4 w-4" /> {s.label}
                    </Button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumField id="piece-w" label="Largura" value={pieceWidth} onChange={setPieceWidth} min={1} />
                {shapeType !== "quadrado" && (
                  <NumField id="piece-h" label="Altura" value={pieceHeight} onChange={setPieceHeight} min={1} />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Produção (mm)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <NumField id="bleed" label="Sangria" value={bleed} onChange={setBleed} />
                <NumField id="spacing" label="Espaço" value={spacing} onChange={setSpacing} />
                <NumField id="margin" label="Margem" value={margin} onChange={setMargin} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="incl-bleed" className="text-sm font-normal">
                  Considerar sangria
                </Label>
                <Switch id="incl-bleed" checked={includeBleed} onCheckedChange={setIncludeBleed} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="rot" className="text-sm font-normal">
                  Rotação automática
                </Label>
                <Switch id="rot" checked={allowRotation} onCheckedChange={setAllowRotation} />
              </div>
              {shapeType === "triangulo" && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="interlock" className="text-sm font-normal">
                    Encaixe alternado
                  </Label>
                  <Switch id="interlock" checked={interlockTriangles} onCheckedChange={setInterlockTriangles} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pré-visualização</CardTitle>
          </CardHeader>
          <CardContent>
            <SheetPreview input={input} result={result} />
          </CardContent>
        </Card>

        <SheetResultPanel result={result} />
      </div>

      <div className="container-page pb-16">
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link to="/ferramentas/planejador-de-bobina">Planejador de bobina</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/ferramentas/conversor-de-medidas">Conversor de medidas</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
