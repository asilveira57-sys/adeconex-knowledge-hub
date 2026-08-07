import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  Check,
  Copy,
  Download,
  FileImage,
  FileText,
  Info,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  SYMBOLOGIES,
  SYMBOLOGY_BY_ID,
  gs1CheckDigit,
  mod43CheckChar,
  validateValue,
  type SymbologyId,
} from "@/lib/barcode/symbologies";
import { AI_DEFS, buildGs1String, humanReadableGs1, validateAiEntry, type AiEntry } from "@/lib/barcode/gs1";
import {
  SHEET_PRESETS,
  buildLabelSheetPdf,
  buildSequence,
  contrastCheck,
  renderBarcodeSvg,
  svgToPngDataUrl,
  type Rotation,
  type RenderOptions,
} from "@/lib/barcode/render";

const GROUP_LABEL: Record<string, string> = {
  varejo: "Varejo (GS1 Brasil)",
  logistica: "Logística e transporte",
  industrial: "Uso interno e industrial",
  "2d": "Bidimensionais (2D)",
};

const DPIS = [203, 300, 600];
const XDIM_PRESETS = [0.8, 1.0, 1.25, 1.5, 2.0];

interface HistoryItem {
  id: string;
  symbology: SymbologyId;
  value: string;
  label: string;
  at: string;
}

const uid = () => Math.random().toString(36).slice(2, 9);

export function BarcodeGenerator({ initialSymbology = "ean13" }: { initialSymbology?: SymbologyId }) {
  const [symbology, setSymbology] = useState<SymbologyId>(initialSymbology);
  const sym = SYMBOLOGY_BY_ID[symbology];
  const isGs1 = symbology === "gs1-128" || symbology === "gs1-datamatrix";
  const is2d = sym.group === "2d";

  const [value, setValue] = useState(SYMBOLOGY_BY_ID[initialSymbology].placeholder);
  const [addon, setAddon] = useState("");
  const [aiEntries, setAiEntries] = useState<AiEntry[]>([
    { id: uid(), ai: "01", value: "07891234567895" },
    { id: uid(), ai: "10", value: "LOTE123" },
  ]);

  // visual
  const [xdim, setXdim] = useState(sym.xdim.rec);
  const [barHeight, setBarHeight] = useState(Math.max(12, sym.minHeight));
  const [quietZone, setQuietZone] = useState(Number((sym.xdim.rec * sym.quietZone).toFixed(2)));
  const [showText, setShowText] = useState(true);
  const [textPosition, setTextPosition] = useState<"above" | "below">("below");
  const [textSize, setTextSize] = useState(10);
  const [textFont, setTextFont] = useState("Helvetica");
  const [altText, setAltText] = useState("");
  const [barColor, setBarColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [transparent, setTransparent] = useState(false);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [dpi, setDpi] = useState(300);

  // específicos
  const [eccLevel, setEccLevel] = useState<"L" | "M" | "Q" | "H">("M");
  const [bearerBar, setBearerBar] = useState(true);
  const [code39Mod43, setCode39Mod43] = useState(false);
  const [code39FullAscii, setCode39FullAscii] = useState(false);
  const [forceSubset, setForceSubset] = useState<"auto" | "A" | "B" | "C">("auto");

  // folha A4
  const [presetId, setPresetId] = useState(SHEET_PRESETS[3].id);
  const [customSheet, setCustomSheet] = useState(false);
  const [sheet, setSheet] = useState({ ...SHEET_PRESETS[3] });
  const [cropMarks, setCropMarks] = useState(true);
  const [guides, setGuides] = useState(true);
  const [seqMode, setSeqMode] = useState<"repeat" | "increment">("repeat");
  const [seqStart, setSeqStart] = useState(1);
  const [seqStep, setSeqStep] = useState(1);
  const [seqCount, setSeqCount] = useState(40);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPrintOffer, setShowPrintOffer] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [svg, setSvg] = useState("");
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const [renderError, setRenderError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);

  /* -------------------------------------------------- valor efetivo */

  const effectiveValue = useMemo(() => {
    if (isGs1) return buildGs1String(aiEntries);
    return value.trim();
  }, [isGs1, aiEntries, value]);

  const aiErrors = useMemo(
    () => (isGs1 ? aiEntries.map(validateAiEntry).filter(Boolean) as string[] : []),
    [isGs1, aiEntries],
  );

  const validation = useMemo(
    () => (isGs1
      ? { ok: aiErrors.length === 0, blocking: aiErrors.length > 0, message: aiErrors[0] }
      : validateValue(symbology, value)),
    [isGs1, aiErrors, symbology, value],
  );

  const contrast = useMemo(
    () => contrastCheck(barColor, bgColor, transparent),
    [barColor, bgColor, transparent],
  );

  const options: RenderOptions = useMemo(
    () => ({
      symbology,
      value: effectiveValue,
      xdim,
      barHeight,
      quietZone,
      showText,
      textPosition,
      textSize,
      textFont,
      altText: altText || undefined,
      barColor,
      bgColor,
      transparent,
      rotation,
      eccLevel,
      bearerBar,
      code39Mod43,
      code39FullAscii,
      forceSubset,
      addon: addon.trim() || undefined,
    }),
    [
      symbology, effectiveValue, xdim, barHeight, quietZone, showText, textPosition,
      textSize, textFont, altText, barColor, bgColor, transparent, rotation, eccLevel,
      bearerBar, code39Mod43, code39FullAscii, forceSubset, addon,
    ],
  );

  /* -------------------------------------------------- render ao vivo */

  useEffect(() => {
    let cancelled = false;
    if (validation.blocking || !effectiveValue) {
      setSvg("");
      return;
    }
    const t = setTimeout(() => {
      renderBarcodeSvg(options)
        .then((r) => {
          if (cancelled) return;
          setSvg(r.svg);
          setDims({ w: r.widthMm, h: r.heightMm });
          setRenderError(null);
        })
        .catch((e: unknown) => {
          if (cancelled) return;
          setSvg("");
          setRenderError(
            e instanceof Error
              ? e.message.replace("bwipp.", "").replace(/^[a-zA-Z]+: /, "")
              : "Não foi possível gerar este código.",
          );
        });
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [options, validation.blocking, effectiveValue]);

  /* -------------------------------------------------- link compartilhável */

  const buildShareUrl = useCallback(() => {
    const p = new URLSearchParams({
      s: symbology,
      v: effectiveValue,
      x: String(xdim),
      h: String(barHeight),
      q: String(quietZone),
      t: showText ? "1" : "0",
      tp: textPosition,
      ts: String(textSize),
      bc: barColor,
      bg: bgColor,
      tr: transparent ? "1" : "0",
      r: String(rotation),
      d: String(dpi),
      ecc: eccLevel,
    });
    if (altText) p.set("at", altText);
    return `${window.location.origin}${window.location.pathname}?${p.toString()}`;
  }, [
    symbology, effectiveValue, xdim, barHeight, quietZone, showText, textPosition,
    textSize, barColor, bgColor, transparent, rotation, dpi, eccLevel, altText,
  ]);

  // hidrata a configuração a partir da query string (somente no cliente)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!p.get("s") && !p.get("v")) return;
    const s = p.get("s") as SymbologyId | null;
    if (s && SYMBOLOGY_BY_ID[s]) setSymbology(s);
    const v = p.get("v");
    if (v) setValue(v);
    const num = (k: string, fn: (n: number) => void) => {
      const raw = p.get(k);
      if (raw !== null && !Number.isNaN(Number(raw))) fn(Number(raw));
    };
    num("x", setXdim);
    num("h", setBarHeight);
    num("q", setQuietZone);
    num("ts", setTextSize);
    num("d", setDpi);
    num("r", (n) => setRotation(n as Rotation));
    if (p.get("t")) setShowText(p.get("t") === "1");
    if (p.get("tr")) setTransparent(p.get("tr") === "1");
    if (p.get("tp") === "above" || p.get("tp") === "below") setTextPosition(p.get("tp") as "above" | "below");
    if (p.get("bc")) setBarColor(p.get("bc")!);
    if (p.get("bg")) setBgColor(p.get("bg")!);
    if (p.get("at")) setAltText(p.get("at")!);
    const ecc = p.get("ecc");
    if (ecc === "L" || ecc === "M" || ecc === "Q" || ecc === "H") setEccLevel(ecc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -------------------------------------------------- ações */

  const changeSymbology = (id: SymbologyId) => {
    const next = SYMBOLOGY_BY_ID[id];
    setSymbology(id);
    setValue(next.placeholder);
    setAddon("");
    setXdim(next.xdim.rec);
    setBarHeight(Math.max(next.group === "2d" ? 20 : 12, next.minHeight));
    setQuietZone(Number((next.xdim.rec * next.quietZone).toFixed(2)));
  };

  const pushHistory = (label: string) => {
    setHistory((h) =>
      [
        {
          id: uid(),
          symbology,
          value: effectiveValue,
          label,
          at: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
        ...h,
      ].slice(0, 12),
    );
  };

  const calcCheckDigit = () => {
    const raw = value.trim();
    const lens: Partial<Record<SymbologyId, number>> = { ean13: 13, ean8: 8, upca: 12, itf14: 14, sscc18: 18 };
    const len = lens[symbology];
    if (len) {
      const body = raw.slice(0, len - 1).padStart(len - 1, "0");
      setValue(`${body}${gs1CheckDigit(body)}`);
      toast.success("Dígito verificador calculado.");
      return;
    }
    if (symbology === "code39") {
      const c = mod43CheckChar(raw);
      if (c) {
        setValue(`${raw}${c}`);
        toast.success(`Dígito módulo 43 adicionado: ${c}`);
      }
      return;
    }
    if (symbology === "itf" && raw.length % 2) {
      setValue(`0${raw}`);
      toast.success("Zero à esquerda adicionado.");
      return;
    }
    toast.info("Esta simbologia não usa dígito verificador manual.");
  };

  const itf14FromEan = (indicator: string) => {
    const ean = value.trim().replace(/\D/g, "");
    const base = ean.length >= 12 ? ean.slice(0, 12) : "";
    if (!base) {
      toast.error("Digite antes um EAN-13 válido no campo de conteúdo.");
      return;
    }
    const body = `${indicator}${base}`;
    const full = `${body}${gs1CheckDigit(body)}`;
    setSymbology("itf14");
    setValue(full);
    setXdim(SYMBOLOGY_BY_ID.itf14.xdim.rec);
    setBarHeight(SYMBOLOGY_BY_ID.itf14.minHeight);
    toast.success(`ITF-14 gerado a partir do EAN-13: ${full}`);
  };

  const copy = async (text: string, key: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast.success(msg);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fileBase = `adeconex-${symbology}-${effectiveValue.replace(/[^\w-]/g, "").slice(0, 24) || "codigo"}`;

  const downloadSvg = () => {
    if (!svg) return;
    downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${fileBase}.svg`);
    pushHistory("SVG");
  };

  const downloadPng = async () => {
    if (!svg) return;
    const data = await svgToPngDataUrl(svg, dims.w, dims.h, dpi, transparent, bgColor);
    const res = await fetch(data);
    downloadBlob(await res.blob(), `${fileBase}-${dpi}dpi.png`);
    pushHistory(`PNG ${dpi} dpi`);
  };

  const copyImage = async () => {
    if (!svg) return;
    try {
      const data = await svgToPngDataUrl(svg, dims.w, dims.h, dpi, false, bgColor);
      const blob = await (await fetch(data)).blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Imagem copiada para a área de transferência.");
    } catch {
      toast.error("Seu navegador não permitiu copiar a imagem. Use o download em PNG.");
    }
  };

  const activeSheet = customSheet
    ? sheet
    : SHEET_PRESETS.find((p) => p.id === presetId) ?? SHEET_PRESETS[3];

  const downloadPdf = async () => {
    if (!effectiveValue || validation.blocking) return;
    setPdfLoading(true);
    try {
      const perPage = activeSheet.cols * activeSheet.rows;
      const count = seqMode === "repeat" ? perPage : Math.max(1, Math.min(seqCount, 500));
      const values = buildSequence(symbology, effectiveValue, count, seqMode, seqStart, seqStep);
      const blob = await buildLabelSheetPdf(options, values, {
        ...activeSheet,
        cropMarks,
        guides,
        dpi,
      });
      downloadBlob(blob, `${fileBase}-folha-a4.pdf`);
      pushHistory(`PDF A4 (${count} etiquetas)`);
      setShowPrintOffer(true);
    } catch {
      toast.error("Não foi possível montar a folha A4. Revise as medidas da grade.");
    } finally {
      setPdfLoading(false);
    }
  };

  /* -------------------------------------------------- avisos técnicos */

  const warnings: string[] = [];
  if (!is2d && barHeight < sym.minHeight) {
    warnings.push(
      `A altura de barras está em ${barHeight} mm — abaixo dos ${sym.minHeight} mm recomendados para ${sym.label}. A leitura pode falhar em scanner de gôndola.`,
    );
  }
  if (xdim < sym.xdim.min) {
    warnings.push(
      `A ampliação (X-dimension) está em ${xdim} mm, abaixo do mínimo de ${sym.xdim.min} mm da GS1 para ${sym.label}.`,
    );
  }
  if (!is2d && quietZone < xdim * (sym.quietZone * 0.7)) {
    warnings.push(
      `A quiet zone está reduzida. Para ${sym.label}, o recomendado é ao menos ${(xdim * sym.quietZone).toFixed(1)} mm de margem clara em cada lado.`,
    );
  }
  if (dpi === 203 && xdim < 0.33) {
    warnings.push("Em 203 dpi, ampliações abaixo de 0,33 mm produzem barras irregulares. Prefira 300 dpi.");
  }

  /* -------------------------------------------------- UI */

  const configPanel = (
    <Accordion type="multiple" defaultValue={["dim", "texto", "cor"]} className="w-full">
      <AccordionItem value="dim">
        <AccordionTrigger className="text-sm font-semibold">Dimensões e impressão</AccordionTrigger>
        <AccordionContent className="space-y-5 pt-2">
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Ampliação / X-dimension</Label>
              <span className="font-mono text-xs text-muted-foreground">{xdim.toFixed(3)} mm</span>
            </div>
            <Slider
              className="mt-3"
              min={0.1}
              max={1.6}
              step={0.005}
              value={[xdim]}
              onValueChange={([v]) => setXdim(Number(v.toFixed(3)))}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {XDIM_PRESETS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setXdim(Number((sym.xdim.rec * f).toFixed(3)))}
                  className="rounded-full border hairline px-2.5 py-1 text-xs hover:bg-accent"
                >
                  {f.toFixed(1).replace(".", ",")}×
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Intervalo recomendado pela GS1 para {sym.label}: {sym.xdim.min} a {sym.xdim.max} mm.
            </p>
          </div>

          {!is2d ? (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Altura das barras</Label>
                <span className="font-mono text-xs text-muted-foreground">{barHeight} mm</span>
              </div>
              <Slider
                className="mt-3"
                min={5}
                max={60}
                step={0.5}
                value={[barHeight]}
                onValueChange={([v]) => setBarHeight(v)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Mínimo recomendado: {sym.minHeight} mm.
              </p>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Quiet zone (margem clara)</Label>
              <span className="font-mono text-xs text-muted-foreground">{quietZone} mm</span>
            </div>
            <Slider
              className="mt-3"
              min={0}
              max={15}
              step={0.1}
              value={[quietZone]}
              onValueChange={([v]) => setQuietZone(Number(v.toFixed(1)))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Rotação</Label>
              <Select value={String(rotation)} onValueChange={(v) => setRotation(Number(v) as Rotation)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0° (picket fence)</SelectItem>
                  <SelectItem value="90">90° (ladder)</SelectItem>
                  <SelectItem value="180">180°</SelectItem>
                  <SelectItem value="270">270°</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">DPI de exportação</Label>
              <Select value={String(dpi)} onValueChange={(v) => setDpi(Number(v))}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DPIS.map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} dpi</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="texto">
        <AccordionTrigger className="text-sm font-semibold">Texto legível</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Exibir texto sob o código</Label>
            <Switch checked={showText} onCheckedChange={setShowText} disabled={is2d} />
          </div>
          {is2d ? (
            <p className="text-xs text-muted-foreground">
              Códigos 2D não exibem texto legível dentro do símbolo. Use o texto complementar.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Posição</Label>
                  <Select value={textPosition} onValueChange={(v) => setTextPosition(v as "above" | "below")}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="below">Abaixo</SelectItem>
                      <SelectItem value="above">Acima</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Fonte</Label>
                  <Select value={textFont} onValueChange={setTextFont}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Courier">Courier (monoespaçada)</SelectItem>
                      <SelectItem value="Times-Roman">Times</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Tamanho do texto</Label>
                  <span className="font-mono text-xs text-muted-foreground">{textSize} pt</span>
                </div>
                <Slider className="mt-3" min={5} max={24} step={1} value={[textSize]} onValueChange={([v]) => setTextSize(v)} />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Texto complementar (produto, SKU, referência)</Label>
            <Input
              className="mt-1.5"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Ex.: Etiqueta couché 100 × 50 mm"
            />
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cor">
        <AccordionTrigger className="text-sm font-semibold">Cores e contraste</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Cor das barras</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={barColor}
                  onChange={(e) => setBarColor(e.target.value)}
                  className="h-9 w-10 cursor-pointer rounded border hairline bg-transparent"
                  aria-label="Cor das barras"
                />
                <Input value={barColor} onChange={(e) => setBarColor(e.target.value)} className="font-mono text-xs" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Cor de fundo</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  disabled={transparent}
                  className="h-9 w-10 cursor-pointer rounded border hairline bg-transparent disabled:opacity-40"
                  aria-label="Cor de fundo"
                />
                <Input
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  disabled={transparent}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Fundo transparente (PNG/SVG)</Label>
            <Switch checked={transparent} onCheckedChange={setTransparent} />
          </div>
          <p
            className={cn(
              "rounded-md border hairline p-3 text-xs",
              contrast.level === "ruim" && "border-destructive/40 bg-destructive/5 text-destructive",
              contrast.level === "atencao" && "bg-surface-2 text-foreground",
              contrast.level === "ok" && "text-muted-foreground",
            )}
          >
            {contrast.message} (razão de contraste {contrast.ratio.toFixed(1)}:1)
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="pdf">
        <AccordionTrigger className="text-sm font-semibold">Folha A4 com grade de etiquetas</AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Grade personalizada</Label>
            <Switch checked={customSheet} onCheckedChange={setCustomSheet} />
          </div>
          {!customSheet ? (
            <div>
              <Label className="text-xs">Preset de folha</Label>
              <Select
                value={presetId}
                onValueChange={(v) => {
                  setPresetId(v);
                  const p = SHEET_PRESETS.find((x) => x.id === v);
                  if (p) {
                    setSheet({ ...p });
                    setSeqCount(p.cols * p.rows);
                  }
                }}
              >
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHEET_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {([
                ["cols", "Colunas"],
                ["rows", "Linhas"],
                ["labelW", "Largura (mm)"],
                ["labelH", "Altura (mm)"],
                ["marginX", "Margem esq. (mm)"],
                ["marginY", "Margem sup. (mm)"],
                ["gapX", "Espaço horiz. (mm)"],
                ["gapY", "Espaço vert. (mm)"],
              ] as const).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    className="mt-1.5"
                    type="number"
                    step="0.1"
                    value={sheet[key]}
                    onChange={(e) => setSheet((s) => ({ ...s, [key]: Number(e.target.value) }))}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between rounded-md border hairline px-3 py-2">
              <Label className="text-xs">Marcas de corte</Label>
              <Switch checked={cropMarks} onCheckedChange={setCropMarks} />
            </div>
            <div className="flex items-center justify-between rounded-md border hairline px-3 py-2">
              <Label className="text-xs">Contorno de guia</Label>
              <Switch checked={guides} onCheckedChange={setGuides} />
            </div>
          </div>

          <div>
            <Label className="text-xs">Conteúdo das etiquetas</Label>
            <Select value={seqMode} onValueChange={(v) => setSeqMode(v as "repeat" | "increment")}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="repeat">Repetir o mesmo código</SelectItem>
                <SelectItem value="increment">Sequência numérica incremental</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {seqMode === "increment" ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Inicial</Label>
                  <Input className="mt-1.5" type="number" value={seqStart} onChange={(e) => setSeqStart(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Incremento</Label>
                  <Input className="mt-1.5" type="number" value={seqStep} onChange={(e) => setSeqStep(Number(e.target.value))} />
                </div>
                <div>
                  <Label className="text-xs">Quantidade</Label>
                  <Input className="mt-1.5" type="number" value={seqCount} onChange={(e) => setSeqCount(Number(e.target.value))} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Em códigos GTIN/SSCC, o dígito verificador é recalculado a cada etiqueta.
              </p>
            </>
          ) : null}

          <p className="flex gap-2 rounded-md border hairline bg-surface-2 p-3 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-signal" aria-hidden />
            Ao imprimir, escolha <strong className="mx-1 text-foreground">escala 100% / tamanho real</strong> e
            desative “ajustar à página”. É o erro nº 1 de quem imprime etiqueta em casa.
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ---------------------------------------- coluna esquerda */}
        <div className="space-y-6">
          <div className="rounded-xl border hairline bg-card p-5 md:p-6">
            <h3 className="text-sm font-semibold">1. Escolha o padrão</h3>
            <Select value={symbology} onValueChange={(v) => changeSymbology(v as SymbologyId)}>
              <SelectTrigger className="mt-3" aria-label="Padrão de código de barras">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["varejo", "logistica", "industrial", "2d"] as const).map((g) => (
                  <SelectGroup key={g}>
                    <SelectLabel>{GROUP_LABEL[g]}</SelectLabel>
                    {SYMBOLOGIES.filter((s) => s.group === g).map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-3 text-sm text-muted-foreground">{sym.help}</p>

            <div className="mt-5 border-t hairline pt-5">
              <h3 className="text-sm font-semibold">2. Informe o conteúdo</h3>

              {isGs1 ? (
                <div className="mt-3 space-y-3">
                  {aiEntries.map((entry, i) => {
                    const err = validateAiEntry(entry);
                    const def = AI_DEFS.find((d) => d.ai === entry.ai);
                    return (
                      <div key={entry.id} className="rounded-lg border hairline bg-surface-2 p-3">
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-[190px] flex-1">
                            <Label className="text-xs">Application Identifier</Label>
                            <Select
                              value={entry.ai}
                              onValueChange={(v) =>
                                setAiEntries((list) =>
                                  list.map((x) => (x.id === entry.id ? { ...x, ai: v } : x)),
                                )
                              }
                            >
                              <SelectTrigger className="mt-1.5 bg-card"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {AI_DEFS.map((d) => (
                                  <SelectItem key={d.ai} value={d.ai}>({d.ai}) {d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="min-w-[160px] flex-1">
                            <Label className="text-xs">Valor</Label>
                            <Input
                              className="mt-1.5 bg-card font-mono"
                              value={entry.value}
                              placeholder={def?.hint}
                              onChange={(e) =>
                                setAiEntries((list) =>
                                  list.map((x) => (x.id === entry.id ? { ...x, value: e.target.value } : x)),
                                )
                              }
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Remover AI ${entry.ai}`}
                            onClick={() => setAiEntries((list) => list.filter((x) => x.id !== entry.id))}
                            disabled={aiEntries.length === 1 && i === 0}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className={cn("mt-2 text-xs", err ? "text-destructive" : "text-muted-foreground")}>
                          {err ?? def?.hint}
                        </p>
                      </div>
                    );
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAiEntries((l) => [...l, { id: uid(), ai: "17", value: "" }])}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Adicionar AI
                  </Button>
                  <div className="rounded-md border hairline bg-card p-3">
                    <p className="text-xs text-muted-foreground">String codificada (FNC1 e separadores GS automáticos)</p>
                    <p className="mt-1 break-all font-mono text-sm">{humanReadableGs1(aiEntries) || "—"}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  {symbology === "sscc18" ? <SsccBuilder onBuild={setValue} /> : null}
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="min-w-[220px] flex-1 font-mono"
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={sym.placeholder}
                      inputMode={sym.numericOnly ? "numeric" : "text"}
                      aria-label="Conteúdo do código de barras"
                    />
                    <Button variant="outline" onClick={calcCheckDigit}>
                      <Wand2 className="mr-1.5 h-4 w-4" /> Calcular dígito verificador
                    </Button>
                  </div>

                  {symbology === "ean13" ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border hairline bg-surface-2 p-3">
                      <span className="text-xs text-muted-foreground">Gerar ITF-14 a partir deste EAN-13 — indicador:</span>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => itf14FromEan(String(n))}
                          className="h-7 w-7 rounded-md border hairline bg-card text-xs font-medium hover:bg-accent"
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {(symbology === "ean13" || symbology === "ean8" || symbology === "upca") ? (
                    <div>
                      <Label className="text-xs">Add-on EAN-2 / EAN-5 (revistas, livros e periódicos)</Label>
                      <Input
                        className="mt-1.5 font-mono"
                        value={addon}
                        onChange={(e) => setAddon(e.target.value.replace(/\D/g, "").slice(0, 5))}
                        placeholder="Opcional — 2 ou 5 dígitos"
                      />
                    </div>
                  ) : null}

                  {symbology === "qrcode" ? (
                    <QrPresets onApply={setValue} ecc={eccLevel} setEcc={setEccLevel} />
                  ) : null}

                  {symbology === "code128" ? (
                    <div className="flex items-center gap-3">
                      <Label className="text-xs">Subset</Label>
                      <Select value={forceSubset} onValueChange={(v) => setForceSubset(v as typeof forceSubset)}>
                        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Automático (ótimo)</SelectItem>
                          <SelectItem value="A">Forçar subset A</SelectItem>
                          <SelectItem value="B">Forçar subset B</SelectItem>
                          <SelectItem value="C">Forçar subset C (numérico)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}

                  {symbology === "code39" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex items-center justify-between rounded-md border hairline px-3 py-2">
                        <Label className="text-xs">Dígito verificador módulo 43</Label>
                        <Switch checked={code39Mod43} onCheckedChange={setCode39Mod43} />
                      </div>
                      <div className="flex items-center justify-between rounded-md border hairline px-3 py-2">
                        <Label className="text-xs">Full ASCII</Label>
                        <Switch checked={code39FullAscii} onCheckedChange={setCode39FullAscii} />
                      </div>
                    </div>
                  ) : null}

                  {symbology === "itf14" ? (
                    <div className="flex items-center justify-between rounded-md border hairline px-3 py-2">
                      <Label className="text-xs">Bearer bar (moldura para papelão ondulado)</Label>
                      <Switch checked={bearerBar} onCheckedChange={setBearerBar} />
                    </div>
                  ) : null}

                  {validation.message ? (
                    <div
                      className={cn(
                        "flex flex-wrap items-center gap-2 rounded-md p-3 text-sm",
                        validation.blocking ? "bg-destructive/10 text-destructive" : "bg-surface-2 text-muted-foreground",
                      )}
                    >
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                      <span>{validation.message}</span>
                      {validation.fix ? (
                        <Button size="sm" variant="outline" onClick={() => setValue(validation.fix!)}>
                          Corrigir para {validation.fix}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {!validation.message && validation.info ? (
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Info className="mt-0.5 h-4 w-4 shrink-0 text-signal" aria-hidden />
                      {validation.info}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* preview */}
          <div className="rounded-xl border hairline bg-card p-5 md:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">3. Pré-visualização em tamanho real</h3>
              {dims.w ? (
                <Badge variant="outline" className="font-mono text-xs">
                  {dims.w.toFixed(1)} × {dims.h.toFixed(1)} mm
                </Badge>
              ) : null}
            </div>

            <div className="mt-4 overflow-auto rounded-lg border hairline bg-surface-2 p-6">
              <div className="mx-auto w-fit">
                <Ruler widthMm={dims.w} />
                <div
                  className={cn(
                    "mt-1 flex items-center justify-center rounded p-2",
                    transparent && "qr-transparent-grid",
                  )}
                  style={{ background: transparent ? undefined : bgColor }}
                >
                  {svg ? (
                    <div
                      aria-label="Código de barras gerado"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  ) : (
                    <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                      {renderError ?? validation.message ?? "Informe um conteúdo válido para visualizar."}
                    </p>
                  )}
                </div>
                {altText ? (
                  <p className="mt-2 text-center text-xs text-muted-foreground">{altText}</p>
                ) : null}
              </div>
            </div>

            {warnings.length ? (
              <ul className="mt-4 space-y-1.5">
                {warnings.map((w) => (
                  <li key={w} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" aria-hidden />
                    {w}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-2">
              <Button onClick={downloadPng} disabled={!svg}>
                <FileImage className="mr-1.5 h-4 w-4" /> PNG {dpi} dpi
              </Button>
              <Button variant="outline" onClick={downloadSvg} disabled={!svg}>
                <Download className="mr-1.5 h-4 w-4" /> SVG vetorial
              </Button>
              <Button variant="outline" onClick={downloadPdf} disabled={!svg || pdfLoading}>
                {pdfLoading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileText className="mr-1.5 h-4 w-4" />}
                PDF folha A4
              </Button>
              <Button variant="outline" onClick={copyImage} disabled={!svg}>
                <Copy className="mr-1.5 h-4 w-4" /> Copiar imagem
              </Button>
              <Button
                variant="outline"
                onClick={() => copy(effectiveValue, "num", "Número copiado.")}
                disabled={!effectiveValue}
              >
                {copied === "num" ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
                Copiar número
              </Button>
              <Button
                variant="outline"
                onClick={() => copy(buildShareUrl(), "link", "Link da configuração copiado.")}
              >
                {copied === "link" ? <Check className="mr-1.5 h-4 w-4" /> : <Link2 className="mr-1.5 h-4 w-4" />}
                Compartilhar configuração
              </Button>
              <Button variant="outline" onClick={() => setScanOpen(true)} disabled={!svg}>
                <Camera className="mr-1.5 h-4 w-4" /> Testar leitura
              </Button>
            </div>

            {showPrintOffer ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border hairline bg-surface-2 p-4">
                <p className="text-sm text-muted-foreground">
                  Quer que a Adeconex imprima em rolo pronto para sua impressora térmica?
                </p>
                <div className="flex gap-2">
                  <Link
                    to="/contato"
                    className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Pedir orçamento
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => setShowPrintOffer(false)}>
                    Agora não
                  </Button>
                </div>
              </div>
            ) : null}

            <p className="mt-4 text-xs text-muted-foreground">
              Download livre, sem cadastro e sem e-mail. Tudo é processado no seu navegador — nenhum código
              de produto é enviado para nossos servidores.
            </p>
          </div>

          {/* histórico */}
          <div className="rounded-xl border hairline bg-card p-5 md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Histórico da sessão</h3>
              {history.length ? (
                <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Limpar
                </Button>
              ) : null}
            </div>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Os códigos gerados nesta sessão aparecem aqui. Nada é salvo no seu navegador nem em nossos servidores.
              </p>
            ) : (
              <ul className="mt-3 divide-y hairline">
                {history.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm">{h.value}</p>
                      <p className="text-xs text-muted-foreground">
                        {SYMBOLOGY_BY_ID[h.symbology].label} · {h.label} · {h.at}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSymbology(h.symbology);
                        setValue(h.value);
                      }}
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Recarregar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ---------------------------------------- painel lateral */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border hairline bg-card p-5">
            <h3 className="text-sm font-semibold">Configuração</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Tudo em milímetros, com atualização ao vivo na pré-visualização.
            </p>
            <div className="mt-3">{configPanel}</div>
          </div>

          <div className="mt-4 rounded-xl border hairline bg-surface-2 p-5">
            <p className="text-sm font-semibold">Precisa imprimir essas etiquetas?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Etiquetas couché, BOPP e ribbons em rolo, prontos para sua impressora térmica.
            </p>
            <Link
              to="/contato"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
            >
              Solicite um orçamento →
            </Link>
          </div>

          <p className="mt-4 flex gap-2 rounded-xl border hairline p-4 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 text-signal" aria-hidden />
            Para vender no varejo é necessário um prefixo de empresa licenciado pela GS1 Brasil. Códigos
            gerados aqui para uso interno, logística ou controle de estoque não precisam de licença.
          </p>
        </aside>
      </div>

      <ScanTestDialog open={scanOpen} onOpenChange={setScanOpen} expected={effectiveValue} />
    </div>
  );
}

/* ------------------------------------------------------------- auxiliares */

function Ruler({ widthMm }: { widthMm: number }) {
  if (!widthMm) return null;
  const marks = Math.min(40, Math.max(2, Math.round(widthMm / 10)));
  return (
    <div className="flex items-end" style={{ width: `${widthMm}mm` }} aria-hidden>
      {Array.from({ length: marks }).map((_, i) => (
        <div key={i} className="flex-1 border-l border-hairline text-[8px] leading-none text-muted-foreground">
          <span className="pl-0.5">{(i + 1) * 10}</span>
        </div>
      ))}
      <span className="pl-1 text-[8px] text-muted-foreground">mm</span>
    </div>
  );
}

function SsccBuilder({ onBuild }: { onBuild: (v: string) => void }) {
  const [ext, setExt] = useState("0");
  const [prefix, setPrefix] = useState("7891234");
  const [serial, setSerial] = useState("0000001");

  const body = `${ext}${prefix}${serial}`.replace(/\D/g, "").slice(0, 17).padEnd(17, "0");
  const full = `${body}${gs1CheckDigit(body)}`;

  return (
    <div className="rounded-lg border hairline bg-surface-2 p-3">
      <p className="text-xs font-medium">Montar SSCC-18</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Dígito de extensão</Label>
          <Input className="mt-1.5 bg-card font-mono" value={ext} maxLength={1} onChange={(e) => setExt(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div>
          <Label className="text-xs">Prefixo GS1 da empresa</Label>
          <Input className="mt-1.5 bg-card font-mono" value={prefix} onChange={(e) => setPrefix(e.target.value.replace(/\D/g, ""))} />
        </div>
        <div>
          <Label className="text-xs">Número serial</Label>
          <Input className="mt-1.5 bg-card font-mono" value={serial} onChange={(e) => setSerial(e.target.value.replace(/\D/g, ""))} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <p className="font-mono text-sm">{full}</p>
        <Button size="sm" variant="outline" onClick={() => onBuild(full)}>Usar este SSCC</Button>
      </div>
    </div>
  );
}

function QrPresets({
  onApply,
  ecc,
  setEcc,
}: {
  onApply: (v: string) => void;
  ecc: "L" | "M" | "Q" | "H";
  setEcc: (v: "L" | "M" | "Q" | "H") => void;
}) {
  const [preset, setPreset] = useState("url");
  const [f, setF] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const apply = () => {
    switch (preset) {
      case "url":
        onApply(f.url ?? "");
        break;
      case "texto":
        onApply(f.texto ?? "");
        break;
      case "tel":
        onApply(`tel:${(f.tel ?? "").replace(/\D/g, "")}`);
        break;
      case "email":
        onApply(`mailto:${f.email ?? ""}${f.assunto ? `?subject=${encodeURIComponent(f.assunto)}` : ""}`);
        break;
      case "wifi":
        onApply(`WIFI:T:${f.seg ?? "WPA"};S:${f.ssid ?? ""};P:${f.senha ?? ""};;`);
        break;
      case "vcard":
        onApply(
          `BEGIN:VCARD\nVERSION:3.0\nN:${f.nome ?? ""}\nORG:${f.empresa ?? ""}\nTEL:${f.tel ?? ""}\nEMAIL:${f.email ?? ""}\nEND:VCARD`,
        );
        break;
      case "pix":
        onApply(f.pix ?? "");
        break;
      default:
        break;
    }
  };

  const fields: Record<string, [string, string][]> = {
    url: [["url", "Endereço (https://...)"]],
    texto: [["texto", "Texto livre"]],
    tel: [["tel", "Telefone com DDD"]],
    email: [["email", "E-mail"], ["assunto", "Assunto (opcional)"]],
    wifi: [["ssid", "Nome da rede (SSID)"], ["senha", "Senha"]],
    vcard: [["nome", "Nome"], ["empresa", "Empresa"], ["tel", "Telefone"], ["email", "E-mail"]],
    pix: [["pix", "Pix copia e cola (BR Code / EMV)"]],
  };

  return (
    <div className="rounded-lg border hairline bg-surface-2 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[180px] flex-1">
          <Label className="text-xs">Tipo de conteúdo</Label>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="mt-1.5 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="url">URL / link</SelectItem>
              <SelectItem value="texto">Texto</SelectItem>
              <SelectItem value="tel">Telefone</SelectItem>
              <SelectItem value="email">E-mail</SelectItem>
              <SelectItem value="wifi">Wi-Fi</SelectItem>
              <SelectItem value="vcard">Contato (vCard)</SelectItem>
              <SelectItem value="pix">Pix copia e cola</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs">Correção de erro</Label>
          <Select value={ecc} onValueChange={(v) => setEcc(v as "L" | "M" | "Q" | "H")}>
            <SelectTrigger className="mt-1.5 bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="L">L — 7%</SelectItem>
              <SelectItem value="M">M — 15%</SelectItem>
              <SelectItem value="Q">Q — 25%</SelectItem>
              <SelectItem value="H">H — 30%</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {fields[preset].map(([k, label]) => (
          <div key={k} className={k === "pix" || k === "texto" ? "sm:col-span-2" : undefined}>
            <Label className="text-xs">{label}</Label>
            {k === "pix" || k === "texto" ? (
              <Textarea className="mt-1.5 bg-card" rows={3} value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
            ) : (
              <Input className="mt-1.5 bg-card" value={f[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
            )}
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="mt-3" onClick={apply}>Aplicar conteúdo</Button>
    </div>
  );
}

function ScanTestDialog({
  open,
  onOpenChange,
  expected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expected: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<string>("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;

    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const Detector = (window as unknown as { BarcodeDetector?: new (o?: unknown) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        if (!Detector) {
          setStatus("Seu navegador não tem leitor nativo de código de barras. Use o Chrome no Android ou teste com o app da câmera.");
          return;
        }
        const detector = new Detector();
        setStatus("Aponte a câmera para o código impresso ou para a tela.");
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length) {
              setResult(codes[0].rawValue);
              return;
            }
          } catch {
            /* ignora frames inválidos */
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setStatus("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    };
    void run();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      setResult(null);
      setStatus("");
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Teste de leitura</DialogTitle>
        </DialogHeader>
        <video ref={videoRef} playsInline muted className="w-full rounded-lg bg-black" />
        {result ? (
          <p
            className={cn(
              "rounded-md p-3 text-sm",
              result === expected ? "bg-surface-2 text-foreground" : "bg-destructive/10 text-destructive",
            )}
          >
            {result === expected
              ? `Leitura confirmada: ${result}`
              : `O scanner leu "${result}", diferente do código gerado.`}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{status || "Iniciando câmera…"}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
