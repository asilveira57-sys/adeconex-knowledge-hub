import { useMemo, useRef, useState } from "react";
import {
  Barcode,
  Image as ImageIcon,
  Info,
  QrCode,
  Save,
  ShoppingCart,
  Trash2,
  Type as TypeIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  const fileRef = useRef<HTMLInputElement>(null);

  const spec = products.find((p) => p.id === design.base_product_id) ?? null;

  const selected = design.layout.find((l) => l.id === selectedId) ?? null;
  const scale = useMemo(() => {
    const maxW = 560;
    const maxH = 360;
    return Math.min(maxW / design.width_mm, maxH / design.height_mm, 8);
  }, [design.width_mm, design.height_mm]);

  const unitPrice = unitPriceForQuantity(tiers, quantity);
  const total = unitPrice * quantity;

  function patch(next: Partial<LabelDesign>) {
    onChange({ ...design, ...next });
  }

  function addLayer(layer: LabelLayer) {
    onChange({ ...design, layout: [...design.layout, layer] });
    setSelectedId(layer.id);
  }

  function patchLayer(id: string, next: Partial<LabelLayer>) {
    onChange({
      ...design,
      layout: design.layout.map((l) => (l.id === id ? ({ ...l, ...next } as LabelLayer) : l)),
    });
  }

  function removeLayer(id: string) {
    onChange({ ...design, layout: design.layout.filter((l) => l.id !== id) });
    setSelectedId(null);
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
      const dataUrl = await downscaleImage(file);
      addLayer({
        id: newLayerId(),
        kind: "image",
        x: 5,
        y: 5,
        w: Math.min(30, design.width_mm - 10),
        h: Math.min(20, design.height_mm - 10),
        dataUrl,
        rotation: 0,
      });
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
            accept="image/*"
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
                  onChange(next);
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
        <div className="flex min-h-[420px] items-center justify-center rounded-lg border hairline bg-surface-2 p-6">
          <LabelCanvas
            design={design}
            safeMarginMm={spec?.safe_margin_mm ?? 0}
            scale={scale}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={(id, x, y) => patchLayer(id, { x, y } as Partial<LabelLayer>)}
          />
        </div>

        <p className="flex items-start gap-2 rounded-md border hairline bg-card p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          A impressão é feita em <strong className="mx-1 text-foreground">uma única cor</strong> —
          a cor escolhida do ribbon. Fotos e degradês são convertidos para traço nessa cor.
          Arraste os elementos para posicionar.
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
                onChange={(e) => patch({ width_mm: clamp(Number(e.target.value), 10, 400) })}
              />
            </div>
            <div>
              <Label htmlFor="h">Altura (mm)</Label>
              <Input
                id="h"
                type="number"
                disabled={!!spec}
                value={design.height_mm}
                onChange={(e) => patch({ height_mm: clamp(Number(e.target.value), 10, 400) })}
              />
            </div>
          </div>
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
