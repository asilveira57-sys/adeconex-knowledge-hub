import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { renderZpl } from "@/lib/zpl.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Copy,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Upload,
  ChevronLeft,
  ChevronRight,
  Share2,
} from "lucide-react";

const DPMM_OPTIONS = [
  { value: "6dpmm", label: "6 dpmm — 152 dpi" },
  { value: "8dpmm", label: "8 dpmm — 203 dpi" },
  { value: "12dpmm", label: "12 dpmm — 300 dpi" },
  { value: "24dpmm", label: "24 dpmm — 600 dpi" },
] as const;

const SIZE_PRESETS = [
  { label: "100 × 150 mm (envio)", w: 4, h: 6 },
  { label: "100 × 50 mm", w: 4, h: 2 },
  { label: "80 × 40 mm", w: 3.15, h: 1.57 },
  { label: "60 × 40 mm", w: 2.36, h: 1.57 },
  { label: "50 × 30 mm", w: 1.97, h: 1.18 },
  { label: "33 × 22 mm (gôndola)", w: 1.3, h: 0.87 },
];

const TEMPLATES: { id: string; label: string; zpl: string }[] = [
  {
    id: "basica",
    label: "Etiqueta simples com código de barras",
    zpl: `^XA
^CI28
^PW800
^LL400
^FO30,30^A0N,40,40^FDADECONEX ETIQUETAS^FS
^FO30,90^A0N,28,28^FDProduto: Ribbon Cera 110x300^FS
^FO30,130^A0N,28,28^FDSKU: RIB-CERA-110300^FS
^FO30,190^BY3,2.5,90^BCN,90,Y,N,N^FD7891234567895^FS
^XZ`,
  },
  {
    id: "preco",
    label: "Etiqueta de preço / gôndola",
    zpl: `^XA
^CI28
^PW400
^LL240
^FO20,20^A0N,30,30^FDPapel Couche 100x50^FS
^FO20,60^A0N,70,70^FDR$ 39,90^FS
^FO20,140^BY2^BCN,60,Y,N,N^FD7891234567895^FS
^XZ`,
  },
  {
    id: "qr",
    label: "Etiqueta com QR Code",
    zpl: `^XA
^CI28
^PW600
^LL400
^FO30,30^A0N,36,36^FDRastreabilidade^FS
^FO30,90^BQN,2,7^FDQA,https://adeconex.com.br^FS
^FO260,120^A0N,28,28^FDLote: 2026-08^FS
^FO260,160^A0N,28,28^FDValidade: 08/2028^FS
^XZ`,
  },
  {
    id: "logistica",
    label: "Etiqueta logística 100 × 150 mm",
    zpl: `^XA
^CI28
^PW800
^LL1200
^FO30,30^GB740,0,4^FS
^FO30,60^A0N,50,50^FDDESTINATARIO^FS
^FO30,120^A0N,32,32^FDCliente Exemplo LTDA^FS
^FO30,165^A0N,28,28^FDAv. Industrial, 1000 - Serra/ES^FS
^FO30,205^A0N,28,28^FDCEP 29160-000^FS
^FO30,260^GB740,0,4^FS
^FO30,300^A0N,32,32^FDVolume 1 de 1  -  Peso 12,5 kg^FS
^FO30,360^BY4,2.5,160^BCN,160,Y,N,N^FD00789123450000000018^FS
^FO30,580^A0N,28,28^FDPedido: 100245^FS
^XZ`,
  },
];

const SHARE_VERSION = "1";

function decodeSharedZpl(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    return decodeURIComponent(raw);
  } catch {
    return undefined;
  }
}

function WhatsAppIcon(props: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={props.className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.297.298-.496.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

type Dpmm = (typeof DPMM_OPTIONS)[number]["value"];

export interface ZplGeneratorSearchState {
  v?: string;
  zpl?: string;
  dpmm?: Dpmm;
  w?: number;
  h?: number;
  r?: "0" | "90" | "180" | "270";
  t?: string;
}

export interface ZplGeneratorProps {
  initialSearch?: ZplGeneratorSearchState;
}

export function ZplGenerator({ initialSearch }: ZplGeneratorProps) {
  const render = useServerFn(renderZpl);

  const initialZpl =
    initialSearch?.v === SHARE_VERSION && initialSearch.zpl
      ? (decodeSharedZpl(initialSearch.zpl) ?? TEMPLATES[0].zpl)
      : initialSearch?.t
        ? (TEMPLATES.find((x) => x.id === initialSearch.t)?.zpl ?? TEMPLATES[0].zpl)
        : TEMPLATES[0].zpl;

  const [zpl, setZpl] = useState(initialZpl);
  const [dpmm, setDpmm] = useState<Dpmm>(initialSearch?.dpmm ?? "8dpmm");
  const [width, setWidth] = useState(initialSearch?.w ?? 4);
  const [height, setHeight] = useState(initialSearch?.h ?? 6);
  const [rotation, setRotation] = useState<"0" | "90" | "180" | "270">(
    initialSearch?.r ?? "0",
  );
  const [index, setIndex] = useState(0);
  const [total, setTotal] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sincroniza a URL com o estado atual (parâmetros versionados).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("v", SHARE_VERSION);
    url.searchParams.set("zpl", encodeURIComponent(zpl));
    url.searchParams.set("dpmm", dpmm);
    url.searchParams.set("w", String(width));
    url.searchParams.set("h", String(height));
    url.searchParams.set("r", rotation);
    window.history.replaceState({}, "", url.toString());
  }, [zpl, dpmm, width, height, rotation]);

  const run = useCallback(
    async (format: "png" | "pdf") => {
      const payload = {
        zpl,
        dpmm,
        width,
        height,
        index,
        format,
        rotation,
      };
      const res = await render({ data: payload });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    [zpl, dpmm, width, height, index, rotation, render],
  );

  const preview$ = useCallback(async () => {
    if (!zpl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await run("png");
      setPreview(res.dataUrl);
      setTotal(res.totalCount);
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "Falha ao renderizar o ZPL.");
    } finally {
      setLoading(false);
    }
  }, [run, zpl]);

  // Pré-visualização automática com debounce.
  useEffect(() => {
    const t = setTimeout(() => {
      void preview$();
    }, 600);
    return () => clearTimeout(t);
  }, [preview$]);

  const download = async (format: "png" | "pdf") => {
    try {
      const res = await run(format);
      const a = document.createElement("a");
      a.href = res.dataUrl;
      a.download = `etiqueta-adeconex.${format}`;
      a.click();
      toast.success(`Arquivo ${format.toUpperCase()} baixado.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar o arquivo.");
    }
  };

  const downloadZpl = () => {
    const blob = new Blob([zpl], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "etiqueta-adeconex.zpl";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onUpload = async (file: File | undefined) => {
    if (!file) return;
    setZpl(await file.text());
    setIndex(0);
    toast.success("Arquivo ZPL carregado.");
  };

  const shareWhatsApp = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const text = `Veja essa etiqueta ZPL pronta para imprimir no Gerador Adeconex: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const copyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Editor */}
      <div className="rounded-xl border hairline bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Label htmlFor="zpl-editor" className="text-sm font-medium">
            Código ZPL
          </Label>
          <div className="flex flex-wrap gap-2">
            <Select
              onValueChange={(v) => {
                const t = TEMPLATES.find((x) => x.id === v);
                if (t) {
                  setZpl(t.zpl);
                  setIndex(0);
                }
              }}
            >
              <SelectTrigger className="h-9 w-[260px] text-xs">
                <SelectValue placeholder="Carregar modelo pronto" />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Abrir .zpl
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".zpl,.txt,.prn,text/plain"
              className="hidden"
              onChange={(e) => void onUpload(e.target.files?.[0])}
            />
          </div>
        </div>

        <Textarea
          id="zpl-editor"
          value={zpl}
          spellCheck={false}
          onChange={(e) => setZpl(e.target.value)}
          className="mt-3 min-h-[420px] font-mono text-xs leading-relaxed"
          placeholder="^XA ... ^XZ"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(zpl).then(() => toast.success("ZPL copiado."))}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copiar ZPL
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={downloadZpl}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Baixar .zpl
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void preview$()}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Atualizar pré-visualização
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
            Copiar link
          </Button>
          <Button type="button" size="sm" onClick={shareWhatsApp}>
            <WhatsAppIcon className="mr-1.5 h-3.5 w-3.5" />
            WhatsApp
          </Button>
        </div>
      </div>

      {/* Painel + preview */}
      <div className="space-y-6">
        <div className="rounded-xl border hairline bg-card p-5">
          <h3 className="text-sm font-medium">Impressora e etiqueta</h3>

          <div className="mt-4 space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Resolução</Label>
              <Select value={dpmm} onValueChange={(v) => setDpmm(v as Dpmm)}>
                <SelectTrigger className="mt-1.5 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DPMM_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Tamanho da etiqueta</Label>
              <Select
                onValueChange={(v) => {
                  const p = SIZE_PRESETS.find((x) => x.label === v);
                  if (p) {
                    setWidth(p.w);
                    setHeight(p.h);
                  }
                }}
              >
                <SelectTrigger className="mt-1.5 h-9 text-xs">
                  <SelectValue placeholder="Escolher tamanho comum" />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_PRESETS.map((p) => (
                    <SelectItem key={p.label} value={p.label}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="w" className="text-xs text-muted-foreground">
                  Largura (mm)
                </Label>
                <Input
                  id="w"
                  type="number"
                  step="1"
                  className="mt-1.5 h-9"
                  value={Math.round(width * 25.4)}
                  onChange={(e) => setWidth(Math.max(12, Number(e.target.value) || 0) / 25.4)}
                />
              </div>
              <div>
                <Label htmlFor="h" className="text-xs text-muted-foreground">
                  Altura (mm)
                </Label>
                <Input
                  id="h"
                  type="number"
                  step="1"
                  className="mt-1.5 h-9"
                  value={Math.round(height * 25.4)}
                  onChange={(e) => setHeight(Math.max(12, Number(e.target.value) || 0) / 25.4)}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Rotação</Label>
              <Select value={rotation} onValueChange={(v) => setRotation(v as typeof rotation)}>
                <SelectTrigger className="mt-1.5 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["0", "90", "180", "270"] as const).map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}°
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => void download("png")}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Baixar PNG
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => void download("pdf")}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Baixar PDF
            </Button>
          </div>
        </div>

        <div className="rounded-xl border hairline bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Pré-visualização</h3>
            {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
          </div>

          <div className="mt-4 flex min-h-[220px] items-center justify-center rounded-lg border hairline bg-white p-3">
            {preview ? (
              <img
                src={preview}
                alt="Pré-visualização da etiqueta ZPL renderizada"
                className="max-h-[420px] w-auto max-w-full"
              />
            ) : (
              <p className="px-4 text-center text-xs text-muted-foreground">
                {error ?? "Escreva ou cole um ZPL válido entre ^XA e ^XZ para ver a etiqueta."}
              </p>
            )}
          </div>

          {error ? (
            <p className="mt-3 whitespace-pre-wrap rounded-md bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          ) : null}

          {total > 1 ? (
            <div className="mt-3 flex items-center justify-center gap-3 text-xs">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-muted-foreground">
                Etiqueta {index + 1} de {total}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index >= total - 1}
                onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Renderização feita pela API pública da Labelary, o mesmo motor usado como referência de
            ZPL no mercado. Envie apenas etiquetas sem dados sensíveis.
          </p>
        </div>
      </div>
    </div>
  );
}
