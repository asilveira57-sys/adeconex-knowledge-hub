import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Barcode,
  Image as ImageIcon,
  Info,
  QrCode,
  Redo2,
  Save,
  ShoppingCart,
  Trash2,
  Type as TypeIcon,
  Undo2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LabelCanvas } from "@/components/labels/label-canvas";
import { LabelMockup } from "@/components/labels/label-mockup";
import { SYMBOLOGIES } from "@/lib/barcode/symbologies";
import {
  LABEL_FONTS,
  LABEL_TEMPLATES,
  MATERIALS,
  MIN_CUSTOM_QUANTITY,
  RIBBON_COLORS,
  SHAPE_LABELS,
  designFromSpec,
  fitLayoutToLabel,
  materialBackground,
  newLayerId,
  unitPriceForQuantity,
  type LabelDesign,
  type LabelLayer,
  type PriceTier,
  type ProductLabelSpec,
} from "@/lib/labels/shared";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

type Props = {
  design: LabelDesign;
  onChange: (next: LabelDesign) => void;
  products: ProductLabelSpec[];
  tiers: PriceTier[];
  quantity: number;
  onQuantityChange: (q: number) => void;
  onSave: () => void;
  onAddToCart: () => void;
  saving: boolean;
  adding: boolean;
  canAddToCart: boolean;
};

export function LabelEditor({
  design,
  onChange,
  products,
  tiers,
  quantity,
  onQuantityChange,
  onSave,
  onAddToCart,
  saving,
  adding,
  canAddToCart,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showMockup, setShowMockup] = useState(true);
  const [past, setPast] = useState<LabelDesign[]>([]);
  const [future, setFuture] = useState<LabelDesign[]>([]);
  const [imageThreshold, setImageThreshold] = useState(160);

  const lastPush = useRef<{ tag: string; at: number }>({ tag: "", at: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  /** imagens originais (antes da conversão para preto), por camada */
  const originals = useRef<Map<string, string>>(new Map());

  const spec = products.find((p) => p.id === design.base_product_id) ?? null;
  const safeMargin = spec?.safe_margin_mm ?? 0;

  const selected = design.layout.find((l) => l.id === selectedId) ?? null;
  const scale = useMemo(() => {
    const maxW = 560;
    const maxH = 360;
    return Math.min(maxW / design.width_mm, maxH / design.height_mm, 8);
  }, [design.width_mm, design.height_mm]);

  const unitPrice = unitPriceForQuantity(tiers, quantity);
  const total = unitPrice * quantity;

  /** Aplica uma mudança registrando o estado anterior no histórico (Desfazer). */
  const commit = useCallback(
    (next: LabelDesign, tag = "") => {
      const now = Date.now();
      const coalesce = !!tag && lastPush.current.tag === tag && now - lastPush.current.at < 700;
      lastPush.current = { tag, at: now };
      if (!coalesce) setPast((p) => [...p.slice(-49), design]);
      setFuture([]);
      onChange(next);
    },
    [design, onChange],
  );

  const undo = useCallback(() => {
    setPast((p) => {
      if (p.length === 0) return p;
      const prev = p[p.length - 1];
      setFuture((f) => [design, ...f].slice(0, 50));
      lastPush.current = { tag: "", at: 0 };
      onChange(prev);
      return p.slice(0, -1);
    });
  }, [design, onChange]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setPast((p) => [...p, design]);
      lastPush.current = { tag: "", at: 0 };
      onChange(next);
      return f.slice(1);
    });
  }, [design, onChange]);

  function patch(next: Partial<LabelDesign>) {
    commit({ ...design, ...next });
  }

  /** Ao mudar medidas/formato, reajusta a arte para continuar dentro da área útil. */
  function resize(next: Partial<LabelDesign>) {
    const merged = { ...design, ...next };
    commit({ ...merged, layout: fitLayoutToLabel(merged.layout, merged, safeMargin) });
  }

  function addLayer(layer: LabelLayer) {
    commit({ ...design, layout: [...design.layout, layer] });
    setSelectedId(layer.id);
  }

  function patchLayer(id: string, next: Partial<LabelLayer>, tag = "") {
    commit(
      {
        ...design,
        layout: design.layout.map((l) => (l.id === id ? ({ ...l, ...next } as LabelLayer) : l)),
      },
      tag,
    );
  }

  function removeLayer(id: string) {
    commit({ ...design, layout: design.layout.filter((l) => l.id !== id) });
    setSelectedId(null);
  }

  /** Delete apaga o elemento selecionado; Ctrl/Cmd+Z desfaz e Ctrl+Shift+Z refaz. */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }
      if (!typing && selectedId && (e.key === "Delete" || e.key === "Backspace")) {
        e.preventDefault();
        removeLayer(selectedId);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  /** Reaplica a conversão para preto a partir da imagem original enviada. */
  async function applyBlack(id: string, threshold: number) {
    const layer = design.layout.find((l) => l.id === id);
    if (!layer || layer.kind !== "image") return;
    const source = originals.current.get(id) ?? layer.dataUrl;
    if (source.startsWith("data:image/svg+xml")) {
      toast.info("SVG já é vetor: envie em traço preto para impressão em 1 cor.");
      return;
    }
    originals.current.set(id, source);
    try {
      const dataUrl = await binarizeImage(source, threshold);
      patchLayer(id, { dataUrl } as Partial<LabelLayer>);
    } catch {
      toast.error("Não foi possível converter a imagem.");
    }
  }


  async function handleImage(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Envie um arquivo de imagem (PNG, JPG ou SVG).");
      return;
    }
    if (file.size > 6_000_000) {
      toast.error("Imagem muito grande. Envie um arquivo de até 6 MB.");
      return;
    }
    try {
      const original = await downscaleImage(file);
      const dataUrl = file.type === "image/svg+xml" ? original : await binarizeImage(original, 160);
      const id = newLayerId();
      originals.current.set(id, original);
      addLayer({
        id,
        kind: "image",
        x: 5,
        y: 5,
        w: Math.min(30, design.width_mm - 10),
        h: Math.min(20, design.height_mm - 10),
        dataUrl,
        rotation: 0,
      });
      toast.success("Imagem convertida para preto (pronta para impressão em 1 cor).");
    } catch {
      toast.error("Não foi possível processar a imagem.");
    }
  }


  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)_300px]">
      {/* Ferramentas + camadas */}
      <aside className="space-y-6">
        <div className="rounded-lg border hairline bg-card p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Adicionar
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addLayer({
                  id: newLayerId(),
                  kind: "text",
                  x: 5,
                  y: 5,
                  w: Math.max(20, design.width_mm - 10),
                  text: "Novo texto",
                  fontSize: 12,
                  fontFamily: LABEL_FONTS[0],
                  bold: false,
                  italic: false,
                  align: "left",
                  letterSpacing: 0,
                  rotation: 0,
                })
              }
            >
              <TypeIcon className="mr-1.5 h-4 w-4" /> Texto
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addLayer({
                  id: newLayerId(),
                  kind: "barcode",
                  x: 5,
                  y: 5,
                  w: Math.min(50, design.width_mm - 10),
                  h: Math.min(18, design.height_mm - 8),
                  symbology: "code128",
                  value: "ADECONEX123",
                  showText: true,
                  rotation: 0,
                })
              }
            >
              <Barcode className="mr-1.5 h-4 w-4" /> Código
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                addLayer({
                  id: newLayerId(),
                  kind: "qrcode",
                  x: 5,
                  y: 5,
                  w: Math.min(22, Math.min(design.width_mm, design.height_mm) - 6),
                  value: "https://adeconex.com.br",
                  rotation: 0,
                })
              }
            >
              <QrCode className="mr-1.5 h-4 w-4" /> QR Code
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <ImageIcon className="mr-1.5 h-4 w-4" /> Imagem
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleImage(f);
              e.target.value = "";
            }}
          />
        </div>

        <div className="rounded-lg border hairline bg-card p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Modelos prontos
          </h2>
          <div className="space-y-2">
            {LABEL_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  const base = t.build();
                  const next = {
                    ...base,
                    id: design.id,
                    base_product_id: design.base_product_id,
                    ...(spec
                      ? {
                          width_mm: spec.width_mm,
                          height_mm: spec.height_mm,
                          shape: spec.shape,
                          corner_radius_mm: spec.corner_radius_mm,
                        }
                      : {}),
                  };
                  onChange({
                    ...next,
                    layout: fitLayoutToLabel(next.layout, next, safeMargin),
                  });
                  setSelectedId(null);
                  toast.success(`Modelo “${t.name}” carregado`);
                }}
                className="w-full rounded-md border hairline px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
              >
                <span className="block font-medium">{t.name}</span>
                <span className="block text-xs text-muted-foreground">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border hairline bg-card p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Camadas
          </h2>
          {design.layout.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nada adicionado ainda.</p>
          ) : (
            <ul className="space-y-1">
              {design.layout.map((l) => (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(l.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent",
                      selectedId === l.id && "bg-accent",
                    )}
                  >
                    <span className="truncate">{layerTitle(l)}</span>
                    <Trash2
                      className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeLayer(l.id);
                      }}
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Área de edição */}
      <section className="space-y-4">
        {spec && (
          <div className="rounded-lg border hairline bg-card p-4">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Personalizando
            </p>
            <p className="mt-1 font-medium">{spec.name}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-muted-foreground">Formato</dt>
                <dd className="font-medium">{SHAPE_LABELS[spec.shape]}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Medidas</dt>
                <dd className="font-medium">{spec.width_mm} × {spec.height_mm} mm</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Colunas × linhas</dt>
                <dd className="font-medium">{spec.columns} × {spec.rows}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Espaçamento</dt>
                <dd className="font-medium">{spec.gap_x_mm} / {spec.gap_y_mm} mm</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Margem do material {spec.margin_mm} mm · margem de segurança {spec.safe_margin_mm} mm
              {spec.corner_radius_mm ? ` · raio de canto ${spec.corner_radius_mm} mm` : ""}.
              {spec.notes ? ` ${spec.notes}` : ""}
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={past.length === 0}>
            <Undo2 className="mr-1.5 h-4 w-4" /> Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={redo} disabled={future.length === 0}>
            <Redo2 className="mr-1.5 h-4 w-4" /> Refazer
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedId && removeLayer(selectedId)}
            disabled={!selectedId}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Excluir
          </Button>
          <span className="text-xs text-muted-foreground">
            Atalhos: Delete apaga · Ctrl+Z volta · Ctrl+Shift+Z refaz
          </span>
        </div>
        <div className="flex min-h-[420px] items-center justify-center rounded-lg border hairline bg-surface-2 p-6">
          <LabelCanvas
            design={design}
            safeMarginMm={safeMargin}
            scale={scale}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={(id, x, y) => patchLayer(id, { x, y } as Partial<LabelLayer>, `move:${id}`)}
            onResize={(id, next) => patchLayer(id, next, `resize:${id}`)}
          />
        </div>

        <p className="flex items-start gap-2 rounded-md border hairline bg-card p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          A impressão é feita em <strong className="mx-1 text-foreground">uma única cor</strong> —
          a cor escolhida do ribbon. Fotos e degradês são convertidos para traço nessa cor.
          Arraste os elementos para posicionar e use a alça no canto para redimensionar (o texto
          aumenta a fonte junto).
        </p>


        {spec && (
          <div className="rounded-lg border hairline bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Mockup do material
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setShowMockup((v) => !v)}>
                {showMockup ? "Ocultar" : "Ver como fica impresso"}
              </Button>
            </div>
            {showMockup && <LabelMockup design={design} spec={spec} />}
          </div>
        )}

        {/* Propriedades do elemento selecionado */}
        {selected && (
          <div className="rounded-lg border hairline bg-card p-4">
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              {layerTitle(selected)}
            </h2>

            {selected.kind === "text" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="txt">Texto</Label>
                  <Textarea
                    id="txt"
                    value={selected.text}
                    maxLength={300}
                    onChange={(e) => patchLayer(selected.id, { text: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fonte</Label>
                  <Select
                    value={selected.fontFamily}
                    onValueChange={(v) => patchLayer(selected.id, { fontFamily: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LABEL_FONTS.map((f) => (
                        <SelectItem key={f} value={f}>{f.split(",")[0]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fs">Tamanho (pt)</Label>
                  <Input
                    id="fs"
                    type="number"
                    min={3}
                    max={200}
                    value={selected.fontSize}
                    onChange={(e) => patchLayer(selected.id, { fontSize: clamp(Number(e.target.value), 3, 200) })}
                  />
                </div>
                <div>
                  <Label>Alinhamento</Label>
                  <Select
                    value={selected.align}
                    onValueChange={(v) => patchLayer(selected.id, { align: v as "left" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Esquerda</SelectItem>
                      <SelectItem value="center">Centro</SelectItem>
                      <SelectItem value="right">Direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={selected.bold}
                      onCheckedChange={(v) => patchLayer(selected.id, { bold: v })}
                    />
                    Negrito
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={selected.italic}
                      onCheckedChange={(v) => patchLayer(selected.id, { italic: v })}
                    />
                    Itálico
                  </label>
                </div>
              </div>
            )}

            {selected.kind === "barcode" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Simbologia</Label>
                  <Select
                    value={selected.symbology}
                    onValueChange={(v) => patchLayer(selected.id, { symbology: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {SYMBOLOGIES.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="bcv">Conteúdo</Label>
                  <Input
                    id="bcv"
                    value={selected.value}
                    maxLength={300}
                    onChange={(e) => patchLayer(selected.id, { value: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="bcw">Largura (mm)</Label>
                  <Input
                    id="bcw"
                    type="number"
                    value={selected.w}
                    onChange={(e) => patchLayer(selected.id, { w: clamp(Number(e.target.value), 5, design.width_mm) })}
                  />
                </div>
                <div>
                  <Label htmlFor="bch">Altura (mm)</Label>
                  <Input
                    id="bch"
                    type="number"
                    value={selected.h}
                    onChange={(e) => patchLayer(selected.id, { h: clamp(Number(e.target.value), 5, design.height_mm) })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={selected.showText}
                    onCheckedChange={(v) => patchLayer(selected.id, { showText: v })}
                  />
                  Mostrar números
                </label>
              </div>
            )}

            {selected.kind === "qrcode" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="qrv">Conteúdo do QR Code</Label>
                  <Input
                    id="qrv"
                    value={selected.value}
                    maxLength={1200}
                    onChange={(e) => patchLayer(selected.id, { value: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="qrs">Tamanho (mm)</Label>
                  <Input
                    id="qrs"
                    type="number"
                    value={selected.w}
                    onChange={(e) => patchLayer(selected.id, { w: clamp(Number(e.target.value), 8, Math.min(design.width_mm, design.height_mm)) })}
                  />
                </div>
              </div>
            )}

            {selected.kind === "image" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="imw">Largura (mm)</Label>
                  <Input
                    id="imw"
                    type="number"
                    value={selected.w}
                    onChange={(e) => patchLayer(selected.id, { w: clamp(Number(e.target.value), 5, design.width_mm) })}
                  />
                </div>
                <div>
                  <Label htmlFor="imh">Altura (mm)</Label>
                  <Input
                    id="imh"
                    type="number"
                    value={selected.h}
                    onChange={(e) => patchLayer(selected.id, { h: clamp(Number(e.target.value), 5, design.height_mm) })}
                  />
                </div>
                <div className="sm:col-span-2 rounded-md bg-surface-2 p-3">
                  <Label className="text-xs">Conversão para preto (impressão em 1 cor)</Label>
                  <Slider
                    className="mt-3"
                    min={40}
                    max={240}
                    step={5}
                    value={[imageThreshold]}
                    onValueChange={(v) => {
                      const t = v[0] ?? 160;
                      setImageThreshold(t);
                      void applyBlack(selected.id, t);
                    }}
                    onValueCommit={(v) => void applyBlack(selected.id, v[0] ?? 160)}
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Limiar {imageThreshold} — quanto maior, mais áreas viram preto.
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void applyBlack(selected.id, imageThreshold)}
                    >
                      <ImageIcon className="mr-1.5 h-4 w-4" /> Deixar a imagem preta
                    </Button>
                  </div>
                </div>
              </div>

            )}

            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={() => removeLayer(selected.id)}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Remover elemento
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Configurações da etiqueta + pedido */}
      <aside className="space-y-6">
        <div className="rounded-lg border hairline bg-card p-4 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Etiqueta
          </h2>
          <div>
            <Label htmlFor="dn">Nome do modelo</Label>
            <Input
              id="dn"
              value={design.name}
              maxLength={80}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="w">Largura (mm)</Label>
              <Input
                id="w"
                type="number"
                disabled={!!spec}
                value={design.width_mm}
                onChange={(e) => resize({ width_mm: clamp(Number(e.target.value), 10, 400) })}
              />
            </div>
            <div>
              <Label htmlFor="h">Altura (mm)</Label>
              <Input
                id="h"
                type="number"
                disabled={!!spec}
                value={design.height_mm}
                onChange={(e) => resize({ height_mm: clamp(Number(e.target.value), 10, 400) })}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            disabled={design.layout.length === 0}
            onClick={() => {
              onChange({ ...design, layout: fitLayoutToLabel(design.layout, design, safeMargin) });
              toast.success("Arte ajustada à área útil da etiqueta");
            }}
          >
            <Wand2 className="mr-1.5 h-4 w-4" /> Ajustar arte automaticamente
          </Button>

          <div className="rounded-md bg-surface-2 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Formato: {SHAPE_LABELS[design.shape]}</span>
            {spec ? (
              <>
                {" "}— medidas e formato vêm da etiqueta-base escolhida ({spec.width_mm} × {spec.height_mm} mm).
                {spec.notes ? <span className="mt-1 block">{spec.notes}</span> : null}
              </>
            ) : (
              " — escolha a etiqueta-base para carregar as medidas reais do produto."
            )}
          </div>
          <div>
            <Label>Material / cor da etiqueta</Label>
            <Select
              value={design.material}
              onValueChange={(v) => patch({ material: v, background_color: materialBackground(v) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MATERIALS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {MATERIALS.find((m) => m.value === design.material)?.hint}
            </p>
          </div>
          <div>
            <Label>Cor do ribbon (impressão)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {RIBBON_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onClick={() => patch({ ribbon_color: c.value })}
                  className={cn(
                    "h-8 w-8 rounded-full border hairline transition-transform",
                    design.ribbon_color === c.value && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                  style={{ background: c.value }}
                />
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Impressão monocromática: todo o conteúdo sai nesta cor.
            </p>
          </div>
        </div>

        <div className="rounded-lg border hairline bg-card p-4 space-y-4">
          <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
            Pedido
          </h2>
          <div>
            <Label>Etiqueta-base (matéria-prima)</Label>
            <Select
              value={design.base_product_id ?? ""}
              onValueChange={(v) => {
                const s = products.find((p) => p.id === v);
                if (!s) return;
                onChange(designFromSpec(s, { ...design, name: design.name }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Escolha a etiqueta em branco" /></SelectTrigger>
              <SelectContent className="max-h-72">
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} — {p.width_mm}×{p.height_mm} mm ({SHAPE_LABELS[p.shape]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {products.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhuma etiqueta habilitada para personalização no momento.
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="qty">Quantidade (etiquetas)</Label>
            <Input
              id="qty"
              type="number"
              min={MIN_CUSTOM_QUANTITY}
              step={100}
              value={quantity}
              onChange={(e) => onQuantityChange(clamp(Number(e.target.value), MIN_CUSTOM_QUANTITY, 200000))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Mínimo de {MIN_CUSTOM_QUANTITY} etiquetas.
            </p>
          </div>

          <div className="rounded-md bg-surface-2 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Preço unitário</span>
              <span className="font-medium">{brl(unitPrice)}</span>
            </div>
            <div className="mt-1 flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{brl(total)}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Frete calculado no carrinho, pelo CEP de entrega.
            </p>
          </div>

          <div className="space-y-2">
            <Button className="w-full" variant="outline" onClick={onSave} disabled={saving}>
              <Save className="mr-1.5 h-4 w-4" /> {saving ? "Salvando..." : "Salvar modelo"}
            </Button>
            <Button className="w-full" onClick={onAddToCart} disabled={adding || !canAddToCart}>
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              {adding ? "Adicionando..." : "Salvar e adicionar ao carrinho"}
            </Button>
          </div>

          {tiers.length > 0 && (
            <div className="pt-1">
              <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                Tabela por quantidade
              </p>
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {tiers.map((t) => (
                  <li key={t.min_quantity} className="flex justify-between">
                    <span>a partir de {t.min_quantity.toLocaleString("pt-BR")}</span>
                    <span>{brl(t.unit_price)} / un.</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function layerTitle(l: LabelLayer): string {
  if (l.kind === "text") return `Texto — ${l.text.slice(0, 18) || "vazio"}`;
  if (l.kind === "barcode") return `Código — ${l.value.slice(0, 14)}`;
  if (l.kind === "qrcode") return `QR Code — ${l.value.slice(0, 14)}`;
  return "Imagem";
}

function clamp(v: number, min: number, max: number) {
  if (Number.isNaN(v)) return min;
  return Math.min(max, Math.max(min, v));
}

/** Reduz a imagem no navegador para caber no payload salvo. */
async function downscaleImage(file: File): Promise<string> {
  if (file.type === "image/svg+xml") {
    const text = await file.text();
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(text)))}`;
  }
  const bitmap = await createImageBitmap(file);
  const max = 900;
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

/**
 * Converte a imagem para preto puro sobre fundo transparente (1 bit),
 * que é o formato ideal para impressão térmica monocromática.
 */
async function binarizeImage(dataUrl: string, threshold: number): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas indisponível");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const alpha = px[i + 3];
    const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
    const ink = alpha > 24 && lum < threshold;
    px[i] = 0;
    px[i + 1] = 0;
    px[i + 2] = 0;
    px[i + 3] = ink ? 255 : 0;
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/png");
}
