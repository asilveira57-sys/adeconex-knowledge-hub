"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Copy,
  RotateCcw,
  Trash2,
  Upload,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EMPTY_FORM,
  QR_TYPES,
  buildPayload,
  sanitizeField,
  type QrFormState,
  type QrType,
} from "@/lib/qr/payload";
import {
  DEFAULT_STYLE,
  buildMatrix,
  contrastRatio,
  renderSvg,
  svgToPngBlob,
  tryDecode,
  type EccLevel,
  type MarkerShape,
  type ModuleShape,
  type QrStyle,
} from "@/lib/qr/render";

const MAX_LOGO_BYTES = 1024 * 1024; // 1 MB
const LOGO_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
const PNG_SIZES = [500, 1000, 2000, 3000];

/** Evento anônimo: nunca envia o conteúdo digitado. */
function track(event: string, params: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event: `qrcode_${event}`, tool: "gerador-qrcode", ...params });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Falha ao processar a imagem."));
    reader.readAsDataURL(blob);
  });
}

function useDebounced<T>(value: T, delay = 250): T {

  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export function QrGenerator() {
  const [type, setType] = useState<QrType>("url");
  const [form, setForm] = useState<QrFormState>(EMPTY_FORM);
  const [style, setStyle] = useState<QrStyle>(DEFAULT_STYLE);
  const [showPassword, setShowPassword] = useState(false);
  const [pngSize, setPngSize] = useState(1000);
  const [customSize, setCustomSize] = useState("");
  const [format, setFormat] = useState<"png" | "svg" | "pdf">("png");
  

  const [downloading, setDownloading] = useState(false);
  const [decodeState, setDecodeState] = useState<"idle" | "checking" | "ok" | "fail" | "unknown">("idle");
  const [logoName, setLogoName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = useCallback(
    <K extends keyof QrFormState>(key: K, value: QrFormState[K]) =>
      setForm((f) => ({
        ...f,
        [key]: typeof value === "string" ? (sanitizeField(value) as QrFormState[K]) : value,
      })),
    [],
  );

  useEffect(() => {
    track("view");
  }, []);

  // libera o logo da memória ao sair da página
  useEffect(() => {
    const clear = () => setStyle((s) => ({ ...s, logoDataUrl: null }));
    window.addEventListener("beforeunload", clear);
    return () => window.removeEventListener("beforeunload", clear);
  }, []);

  const built = useMemo(() => buildPayload(type, form), [type, form]);
  const debouncedValue = useDebounced(built.value, 220);

  const matrix = useMemo(() => {
    if (!debouncedValue) return null;
    try {
      return buildMatrix(debouncedValue, style.ecc);
    } catch {
      return null;
    }
  }, [debouncedValue, style.ecc]);

  const svg = useMemo(() => (matrix ? renderSvg(matrix, style) : null), [matrix, style]);

  const contrast = contrastRatio(style.fgColor, style.transparent ? "#ffffff" : style.bgColor);
  const lowContrast = contrast < 3;
  const smallMargin = style.margin < 2;
  const complexity = matrix ? (matrix.size >= 61 ? "Alta" : matrix.size >= 41 ? "Média" : "Baixa") : null;

  // validação interna (decodificação) do código gerado
  useEffect(() => {
    if (!svg || !debouncedValue) {
      setDecodeState("idle");
      return;
    }
    let alive = true;
    setDecodeState("checking");
    tryDecode(svg, debouncedValue).then((r) => {
      if (!alive) return;
      setDecodeState(r === null ? "unknown" : r ? "ok" : "fail");
    });
    return () => {
      alive = false;
    };
  }, [svg, debouncedValue]);

  const canDownload = Boolean(svg) && !built.error && !lowContrast;

  function resetStyle() {
    setStyle((s) => ({ ...DEFAULT_STYLE, logoDataUrl: s.logoDataUrl, ecc: s.logoDataUrl ? "H" : "M" }));
    toast.success("Personalização restaurada para o padrão preto e branco.");
  }

  function clearAll() {
    setForm(EMPTY_FORM);
    setStyle(DEFAULT_STYLE);
    setLogoName(null);
    if (fileRef.current) fileRef.current.value = "";
    toast.success("Tudo limpo. Você já pode criar outro QR Code.");
  }

  async function handleLogo(file: File | undefined) {
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      toast.error("Formato não aceito. Envie PNG, JPG, SVG ou WebP.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast.error("Arquivo muito grande. O limite é 1 MB.");
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read"));
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (!dataUrl) {
      toast.error("Não foi possível ler o arquivo. Tente outro.");
      return;
    }
    setLogoName(file.name);
    setStyle((s) => ({ ...s, logoDataUrl: dataUrl, ecc: "H" }));
    track("logo_used", { used: true });
  }

  function removeLogo() {
    setStyle((s) => ({ ...s, logoDataUrl: null }));
    setLogoName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function download() {
    if (!svg || !canDownload) return;
    setDownloading(true);
    const stamp = new Date().toISOString().slice(0, 10);
    const base = `qrcode-adeconex-${stamp}`;
    try {
      let blob: Blob;
      let filename: string;
      if (format === "svg") {
        blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
        filename = `${base}.svg`;
      } else if (format === "pdf") {
        const custom = Number(customSize);
        const size = customSize ? Math.min(4000, Math.max(200, custom || 1000)) : pngSize;
        const png = await svgToPngBlob(svg, size);
        const dataUrl = await blobToDataUrl(png);
        const { jsPDF } = await import("jspdf");
        const doc = new jsPDF({
          unit: "px",
          format: [size, size],
          orientation: "portrait",
          hotfixes: ["px_scaling"],
          compress: false,
        });
        doc.addImage(dataUrl, "PNG", 0, 0, size, size, undefined, "NONE");
        blob = doc.output("blob");
        filename = `${base}-${size}px.pdf`;
      } else {
        const custom = Number(customSize);
        const size = customSize ? Math.min(4000, Math.max(200, custom || 1000)) : pngSize;
        blob = await svgToPngBlob(svg, size);
        filename = `${base}-${size}px.png`;
      }




      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      track("download", {
        format,
        transparent: style.transparent,
        with_logo: Boolean(style.logoDataUrl),
        type,
      });
      toast.success(`Download concluído: ${filename}`);
    } catch {
      toast.error("Falha no download. Tente novamente ou escolha outra resolução.");
    } finally {
      setDownloading(false);
    }
  }

  async function copyContent() {
    if (!built.value) return;
    try {
      await navigator.clipboard.writeText(built.value);
      toast.success("Conteúdo copiado.");
    } catch {
      toast.error("Não foi possível copiar neste navegador.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
      {/* ── Configurações ── */}
      <div className="min-w-0 space-y-8">
        <Card title="1. Escolha o tipo de conteúdo">
          <div
            role="radiogroup"
            aria-label="Tipo de conteúdo do QR Code"
            className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
          >
            {QR_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={type === t.value}
                onClick={() => {
                  setType(t.value);
                  track("type_selected", { type: t.value });
                }}
                className={cn(
                  "rounded-lg border hairline p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  type === t.value ? "border-primary bg-accent" : "hover:bg-accent/60",
                )}
              >
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.hint}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="2. Preencha os dados">
          <TypeFields
            type={type}
            form={form}
            set={set}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />
          {built.error ? (
            <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {built.error}
            </p>
          ) : null}
          {built.warning ? (
            <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {built.warning}
            </p>
          ) : null}
          <p className="mt-4 flex items-start gap-2 rounded-md bg-surface-2 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Seus dados são processados no navegador e não são armazenados.
          </p>
        </Card>

        <Card title="3. Personalizar QR Code">
          <div className="grid gap-5 sm:grid-cols-2">
            <ColorField
              id="qr-fg"
              label="Cor dos módulos"
              value={style.fgColor}
              onChange={(v) => setStyle((s) => ({ ...s, fgColor: v }))}
            />
            <ColorField
              id="qr-bg"
              label="Cor de fundo"
              value={style.bgColor}
              disabled={style.transparent}
              onChange={(v) => setStyle((s) => ({ ...s, bgColor: v }))}
            />
            <ColorField
              id="qr-marker-outer"
              label="Cor dos marcadores"
              value={style.markerOuterColor}
              onChange={(v) => setStyle((s) => ({ ...s, markerOuterColor: v }))}
            />
            <ColorField
              id="qr-marker-inner"
              label="Cor do centro dos marcadores"
              value={style.markerInnerColor}
              onChange={(v) => setStyle((s) => ({ ...s, markerInnerColor: v }))}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-md border hairline p-3">
            <Label htmlFor="qr-transparent" className="text-sm font-medium">
              Fundo transparente
              <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                O arquivo baixado terá transparência real (PNG e SVG).
              </span>
            </Label>
            <Switch
              id="qr-transparent"
              checked={style.transparent}
              onCheckedChange={(v) => {
                setStyle((s) => ({ ...s, transparent: v }));
                track("transparent", { enabled: v });
              }}
            />
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <SelectField
              id="qr-module-shape"
              label="Formato dos módulos"
              value={style.moduleShape}
              onChange={(v) => setStyle((s) => ({ ...s, moduleShape: v as ModuleShape }))}
              options={[
                { value: "square", label: "Quadrado" },
                { value: "rounded", label: "Arredondado" },
                { value: "dots", label: "Pontos" },
              ]}
            />
            <SelectField
              id="qr-marker-shape"
              label="Formato dos marcadores"
              value={style.markerShape}
              onChange={(v) => setStyle((s) => ({ ...s, markerShape: v as MarkerShape }))}
              options={[
                { value: "square", label: "Quadrado" },
                { value: "rounded", label: "Arredondado" },
                { value: "circle", label: "Circular" },
              ]}
            />
            <SelectField
              id="qr-ecc"
              label="Correção de erro"
              value={style.ecc}
              onChange={(v) => setStyle((s) => ({ ...s, ecc: v as EccLevel }))}
              options={[
                { value: "L", label: "L — baixa (7%)" },
                { value: "M", label: "M — média (15%)" },
                { value: "Q", label: "Q — alta (25%)" },
                { value: "H", label: "H — máxima (30%)" },
              ]}
              hint={style.logoDataUrl ? "Com logotipo, recomendamos manter no nível H." : undefined}
            />
            <div>
              <Label htmlFor="qr-margin">Margem de segurança ({style.margin} módulos)</Label>
              <Slider
                id="qr-margin"
                className="mt-3"
                min={0}
                max={8}
                step={1}
                value={[style.margin]}
                onValueChange={([v]) => setStyle((s) => ({ ...s, margin: v ?? 4 }))}
              />
              {smallMargin ? (
                <p className="mt-2 text-xs text-destructive">
                  Margem muito pequena pode impedir a leitura. Use pelo menos 2 módulos.
                </p>
              ) : null}
            </div>
          </div>

          <Button type="button" variant="outline" className="mt-6" onClick={resetStyle}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden /> Restaurar padrão
          </Button>
        </Card>

        <Card title="4. Logotipo central (opcional)">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileRef}
              id="qr-logo"
              type="file"
              accept=".png,.jpg,.jpeg,.svg,.webp,image/png,image/jpeg,image/svg+xml,image/webp"
              className="sr-only"
              onChange={(e) => handleLogo(e.target.files?.[0])}
            />
            <Label
              htmlFor="qr-logo"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md border hairline px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Upload className="h-4 w-4" aria-hidden /> Enviar logotipo
            </Label>
            {style.logoDataUrl ? (
              <>
                <img
                  src={style.logoDataUrl}
                  alt={`Miniatura do logotipo ${logoName ?? "enviado"}`}
                  className="h-12 w-12 rounded border hairline object-contain p-1"
                />
                <span className="max-w-[160px] truncate text-xs text-muted-foreground">{logoName}</span>
                <Button type="button" variant="ghost" size="sm" onClick={removeLogo}>
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Remover
                </Button>
              </>
            ) : (
              <span className="text-xs text-muted-foreground">PNG, JPG, SVG ou WebP — até 1 MB.</span>
            )}
          </div>

          {style.logoDataUrl ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="qr-logo-size">
                  Tamanho do logotipo ({Math.round(style.logoSize * 100)}%)
                </Label>
                <Slider
                  id="qr-logo-size"
                  className="mt-3"
                  min={10}
                  max={28}
                  step={1}
                  value={[Math.round(style.logoSize * 100)]}
                  onValueChange={([v]) => setStyle((s) => ({ ...s, logoSize: (v ?? 20) / 100 }))}
                />
              </div>
              <div>
                <Label htmlFor="qr-logo-padding">
                  Margem interna do logotipo ({Math.round(style.logoPadding * 100)}%)
                </Label>
                <Slider
                  id="qr-logo-padding"
                  className="mt-3"
                  min={0}
                  max={40}
                  step={2}
                  value={[Math.round(style.logoPadding * 100)]}
                  onValueChange={([v]) => setStyle((s) => ({ ...s, logoPadding: (v ?? 16) / 100 }))}
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-md border hairline p-3 sm:col-span-2">
                <Label htmlFor="qr-logo-bg" className="text-sm font-medium">
                  Fundo branco atrás do logotipo
                </Label>
                <Switch
                  id="qr-logo-bg"
                  checked={style.logoWhiteBg}
                  onCheckedChange={(v) => setStyle((s) => ({ ...s, logoWhiteBg: v }))}
                />
              </div>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-muted-foreground">
            Logotipos muito grandes podem dificultar a leitura. Teste o QR Code antes de imprimir. O
            arquivo é processado no seu navegador e não é enviado a nenhum servidor.
          </p>
        </Card>
      </div>

      {/* ── Pré-visualização ── */}
      <aside className="lg:sticky lg:top-24">
        <Card title="Pré-visualização">
          <div
            className={cn(
              "mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center overflow-hidden rounded-lg border hairline p-3",
              style.transparent ? "qr-checkerboard" : "bg-background",
            )}
          >
            {svg ? (
              <div
                className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
                role="img"
                aria-label={`Pré-visualização do QR Code do tipo ${
                  QR_TYPES.find((t) => t.value === type)?.label
                }`}
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            ) : (
              <p className="px-4 text-center text-sm text-muted-foreground">
                {built.error
                  ? "Ajuste os dados ao lado para ver o QR Code."
                  : "Preencha os dados para gerar seu QR Code."}
              </p>
            )}
          </div>

          <dl className="mt-4 space-y-1.5 text-xs">
            {complexity ? (
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Complexidade</dt>
                <dd className="font-medium">
                  {complexity}
                  {complexity === "Alta" ? " — aumente o tamanho de impressão" : ""}
                </dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Contraste</dt>
              <dd className={cn("font-medium", lowContrast && "text-destructive")}>
                {contrast.toFixed(1)}:1 {lowContrast ? "— insuficiente" : "— adequado"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Teste de leitura</dt>
              <dd className="font-medium">
                {decodeState === "checking" && "Verificando…"}
                {decodeState === "ok" && "Leitura confirmada"}
                {decodeState === "fail" && "Não confirmado — teste no celular"}
                {decodeState === "unknown" && "Não foi possível concluir o teste"}
                {decodeState === "idle" && "—"}
              </dd>
            </div>
          </dl>

          {lowContrast ? (
            <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              As cores do código e do fundo estão muito parecidas. Escureça os módulos ou clareie o
              fundo para liberar o download.
            </p>
          ) : null}
          {decodeState === "fail" ? (
            <p role="alert" className="mt-3 flex items-start gap-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Não conseguimos confirmar a leitura automaticamente. Teste o código com o celular
              antes de imprimir — se falhar, reduza o logotipo, aumente a margem ou use correção H.
            </p>
          ) : null}
          {decodeState === "ok" ? (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal" aria-hidden />
              Faça um teste com mais de um celular antes de imprimir grandes quantidades.
            </p>
          ) : null}

          <div className="mt-5 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                id="qr-format"
                label="Formato"
                value={format}
                onChange={(v) => setFormat(v as "png" | "svg" | "pdf")}
                options={[
                  { value: "png", label: "PNG (imagem)" },
                  { value: "svg", label: "SVG (vetorial)" },
                  { value: "pdf", label: "PDF (alta resolução)" },
                ]}
              />
              {format !== "svg" ? (
                <SelectField
                  id="qr-resolution"
                  label="Resolução"
                  value={customSize ? "custom" : String(pngSize)}
                  onChange={(v) => {
                    if (v === "custom") {
                      setCustomSize("1200");
                    } else {
                      setCustomSize("");
                      setPngSize(Number(v));
                    }
                  }}
                  options={[
                    ...PNG_SIZES.map((s) => ({ value: String(s), label: `${s} × ${s} px` })),
                    { value: "custom", label: "Personalizado" },
                  ]}
                />
              ) : null}
            </div>
            {format !== "svg" && customSize ? (

              <div>
                <Label htmlFor="qr-custom-size">Tamanho personalizado (200 a 4000 px)</Label>
                <Input
                  id="qr-custom-size"
                  className="mt-2"
                  inputMode="numeric"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value.replace(/\D/g, "").slice(0, 4))}
                />
              </div>
            ) : null}

            <Button type="button" className="w-full" disabled={!canDownload || downloading} onClick={download}>
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="mr-2 h-4 w-4" aria-hidden />
              )}
              {downloading ? "Gerando arquivo…" : "Baixar QR Code"}
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={copyContent} disabled={!built.value}>
                <Copy className="mr-2 h-4 w-4" aria-hidden /> Copiar conteúdo
              </Button>
              <Button type="button" variant="outline" onClick={clearAll}>
                <Trash2 className="mr-2 h-4 w-4" aria-hidden /> Limpar
              </Button>
            </div>

            {built.testUrl ? (
              <a
                href={built.testUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border hairline px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                <ExternalLink className="h-4 w-4" aria-hidden /> Testar conteúdo
              </a>
            ) : null}
          </div>
        </Card>
      </aside>
    </div>
  );
}

/* ───────── blocos auxiliares ───────── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border hairline bg-card p-5 shadow-card md:p-6">
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="mt-2">{children}</div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Field id={id} label={label}>
      <div className={cn("flex items-center gap-2", disabled && "opacity-50")}>
        <input
          id={id}
          type="color"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border hairline bg-background p-1 disabled:cursor-not-allowed"
        />
        <Input
          aria-label={`${label} em hexadecimal`}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono uppercase"
        />
      </div>
    </Field>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <Field id={id} label={label} hint={hint}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border hairline bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function TypeFields({
  type,
  form,
  set,
  showPassword,
  setShowPassword,
}: {
  type: QrType;
  form: QrFormState;
  set: <K extends keyof QrFormState>(k: K, v: QrFormState[K]) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
}) {
  switch (type) {
    case "url":
      return (
        <Field id="f-url" label="Endereço do site" hint="Links sem https:// são normalizados automaticamente.">
          <Input
            id="f-url"
            inputMode="url"
            placeholder="adeconex.com.br/catalogo"
            value={form.url}
            onChange={(e) => set("url", e.target.value)}
          />
        </Field>
      );
    case "text":
      return (
        <Field
          id="f-text"
          label="Texto"
          hint={`${form.text.length} caracteres${form.text.length > 300 ? " — conteúdo extenso deixa o código mais denso" : ""}`}
        >
          <Textarea id="f-text" rows={4} value={form.text} onChange={(e) => set("text", e.target.value)} />
        </Field>
      );
    case "whatsapp":
      return (
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="f-wa-country" label="País">
            <Input id="f-wa-country" inputMode="numeric" value={form.waCountry} onChange={(e) => set("waCountry", e.target.value)} />
          </Field>
          <Field id="f-wa-area" label="DDD">
            <Input id="f-wa-area" inputMode="numeric" placeholder="27" value={form.waArea} onChange={(e) => set("waArea", e.target.value)} />
          </Field>
          <Field id="f-wa-number" label="Número">
            <Input id="f-wa-number" inputMode="numeric" placeholder="999999999" value={form.waNumber} onChange={(e) => set("waNumber", e.target.value)} />
          </Field>
          <div className="sm:col-span-3">
            <Field id="f-wa-msg" label="Mensagem inicial (opcional)">
              <Textarea id="f-wa-msg" rows={2} value={form.waMessage} onChange={(e) => set("waMessage", e.target.value)} />
            </Field>
          </div>
        </div>
      );
    case "phone":
      return (
        <div className="grid gap-5 sm:grid-cols-3">
          <Field id="f-ph-country" label="País">
            <Input id="f-ph-country" inputMode="numeric" value={form.phoneCountry} onChange={(e) => set("phoneCountry", e.target.value)} />
          </Field>
          <Field id="f-ph-area" label="DDD">
            <Input id="f-ph-area" inputMode="numeric" value={form.phoneArea} onChange={(e) => set("phoneArea", e.target.value)} />
          </Field>
          <Field id="f-ph-number" label="Número">
            <Input id="f-ph-number" inputMode="numeric" value={form.phoneNumber} onChange={(e) => set("phoneNumber", e.target.value)} />
          </Field>
        </div>
      );
    case "email":
      return (
        <div className="grid gap-5">
          <Field id="f-em-to" label="E-mail de destino">
            <Input id="f-em-to" inputMode="email" value={form.emailTo} onChange={(e) => set("emailTo", e.target.value)} />
          </Field>
          <Field id="f-em-sub" label="Assunto (opcional)">
            <Input id="f-em-sub" value={form.emailSubject} onChange={(e) => set("emailSubject", e.target.value)} />
          </Field>
          <Field id="f-em-body" label="Mensagem (opcional)">
            <Textarea id="f-em-body" rows={3} value={form.emailBody} onChange={(e) => set("emailBody", e.target.value)} />
          </Field>
        </div>
      );
    case "sms":
      return (
        <div className="grid gap-5">
          <Field id="f-sms-num" label="Número">
            <Input id="f-sms-num" inputMode="tel" value={form.smsNumber} onChange={(e) => set("smsNumber", e.target.value)} />
          </Field>
          <Field id="f-sms-msg" label="Mensagem">
            <Textarea id="f-sms-msg" rows={3} value={form.smsMessage} onChange={(e) => set("smsMessage", e.target.value)} />
          </Field>
        </div>
      );
    case "wifi":
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="f-wifi-ssid" label="Nome da rede (SSID)">
            <Input id="f-wifi-ssid" value={form.wifiSsid} onChange={(e) => set("wifiSsid", e.target.value)} />
          </Field>
          <SelectField
            id="f-wifi-sec"
            label="Segurança"
            value={form.wifiSecurity}
            onChange={(v) => set("wifiSecurity", v as QrFormState["wifiSecurity"])}
            options={[
              { value: "WPA", label: "WPA / WPA2" },
              { value: "WEP", label: "WEP" },
              { value: "nopass", label: "Sem senha" },
            ]}
          />
          {form.wifiSecurity !== "nopass" ? (
            <Field id="f-wifi-pass" label="Senha">
              <div className="flex gap-2">
                <Input
                  id="f-wifi-pass"
                  type={showPassword ? "text" : "password"}
                  value={form.wifiPassword}
                  onChange={(e) => set("wifiPassword", e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </Field>
          ) : null}
          <div className="flex items-center justify-between gap-4 rounded-md border hairline p-3">
            <Label htmlFor="f-wifi-hidden" className="text-sm font-medium">
              Rede oculta
            </Label>
            <Switch
              id="f-wifi-hidden"
              checked={form.wifiHidden}
              onCheckedChange={(v) => set("wifiHidden", v)}
            />
          </div>
        </div>
      );
    case "geo":
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="f-geo-lat" label="Latitude">
            <Input id="f-geo-lat" inputMode="decimal" placeholder="-20.3155" value={form.geoLat} onChange={(e) => set("geoLat", e.target.value)} />
          </Field>
          <Field id="f-geo-lng" label="Longitude">
            <Input id="f-geo-lng" inputMode="decimal" placeholder="-40.3128" value={form.geoLng} onChange={(e) => set("geoLng", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <Field id="f-geo-maps" label="Link do Google Maps (opcional)" hint="Se preenchido, o link tem prioridade sobre as coordenadas.">
              <Input id="f-geo-maps" value={form.geoMapsUrl} onChange={(e) => set("geoMapsUrl", e.target.value)} />
            </Field>
          </div>
        </div>
      );
    case "vcard":
      return (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="f-vc-fn" label="Nome"><Input id="f-vc-fn" value={form.vcFirstName} onChange={(e) => set("vcFirstName", e.target.value)} /></Field>
          <Field id="f-vc-ln" label="Sobrenome"><Input id="f-vc-ln" value={form.vcLastName} onChange={(e) => set("vcLastName", e.target.value)} /></Field>
          <Field id="f-vc-co" label="Empresa"><Input id="f-vc-co" value={form.vcCompany} onChange={(e) => set("vcCompany", e.target.value)} /></Field>
          <Field id="f-vc-role" label="Cargo"><Input id="f-vc-role" value={form.vcRole} onChange={(e) => set("vcRole", e.target.value)} /></Field>
          <Field id="f-vc-tel" label="Telefone"><Input id="f-vc-tel" inputMode="tel" value={form.vcPhone} onChange={(e) => set("vcPhone", e.target.value)} /></Field>
          <Field id="f-vc-cel" label="Celular"><Input id="f-vc-cel" inputMode="tel" value={form.vcMobile} onChange={(e) => set("vcMobile", e.target.value)} /></Field>
          <Field id="f-vc-em" label="E-mail"><Input id="f-vc-em" inputMode="email" value={form.vcEmail} onChange={(e) => set("vcEmail", e.target.value)} /></Field>
          <Field id="f-vc-site" label="Site"><Input id="f-vc-site" value={form.vcWebsite} onChange={(e) => set("vcWebsite", e.target.value)} /></Field>
          <div className="sm:col-span-2">
            <Field id="f-vc-addr" label="Endereço"><Input id="f-vc-addr" value={form.vcAddress} onChange={(e) => set("vcAddress", e.target.value)} /></Field>
          </div>
          <div className="sm:col-span-2">
            <Field id="f-vc-notes" label="Observações (opcional)">
              <Textarea id="f-vc-notes" rows={2} value={form.vcNotes} onChange={(e) => set("vcNotes", e.target.value)} />
            </Field>
          </div>
        </div>
      );
    case "pix":
      return (
        <Field
          id="f-pix"
          label="Código PIX Copia e Cola"
          hint="Cole o código gerado no seu banco. Não pedimos nem guardamos dados bancários. Confira o recebedor no aplicativo do banco antes de pagar."
        >
          <Textarea id="f-pix" rows={4} className="font-mono text-xs" value={form.pixCode} onChange={(e) => set("pixCode", e.target.value)} />
        </Field>
      );
    default:
      return null;
  }
}
