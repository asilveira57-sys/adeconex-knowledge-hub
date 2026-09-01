import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Boxes, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listPackagingBoxes,
  createPackagingBox,
  updatePackagingBox,
  deletePackagingBox,
  type PackagingBox,
} from "@/lib/packaging.functions";

export type PackagingApply = {
  width_mm: string;
  height_mm: string;
  length_mm: string;
  weight_kg: string;
};

/** Converte string digitada (com vírgula) em número. */
function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Exibe número no padrão brasileiro (vírgula decimal). */
export function br(n: number | null | undefined): string {
  if (n == null) return "";
  return String(n).replace(".", ",");
}

type Draft = {
  name: string;
  width_mm: string;
  height_mm: string;
  length_mm: string;
  suggested_weight_kg: string;
};

const EMPTY: Draft = { name: "", width_mm: "", height_mm: "", length_mm: "", suggested_weight_kg: "" };

/**
 * Caixa de seleção com as embalagens cadastradas.
 * Permite cadastrar, editar e excluir embalagens sem sair do produto.
 */
export function PackagingPicker({ onApply }: { onApply: (v: PackagingApply) => void }) {
  const qc = useQueryClient();
  const list = useServerFn(listPackagingBoxes);
  const create = useServerFn(createPackagingBox);
  const update = useServerFn(updatePackagingBox);
  const remove = useServerFn(deletePackagingBox);

  const { data: boxes = [], isLoading } = useQuery({
    queryKey: ["admin", "packaging-boxes"],
    queryFn: () => list(),
  });

  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState<"none" | "create" | "edit">("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "packaging-boxes"] });

  function draftPayload() {
    const w = num(draft.width_mm);
    const h = num(draft.height_mm);
    const l = num(draft.length_mm);
    if (!draft.name.trim() || !w || !h || !l) {
      throw new Error("Informe nome, largura, altura e comprimento.");
    }
    return {
      name: draft.name.trim(),
      width_mm: w,
      height_mm: h,
      length_mm: l,
      suggested_weight_kg: num(draft.suggested_weight_kg),
    };
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = draftPayload();
      if (mode === "edit" && editingId) {
        return update({ data: { id: editingId, ...payload } });
      }
      return create({ data: { ...payload, sort_order: boxes.length + 1 } });
    },
    onSuccess: async (box: PackagingBox) => {
      await invalidate();
      const wasEdit = mode === "edit";
      setMode("none");
      setEditingId(null);
      setDraft(EMPTY);
      apply(box);
      toast.success(wasEdit ? "Embalagem atualizada" : "Embalagem cadastrada");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      setSelected("");
      setMode("none");
      setEditingId(null);
      await invalidate();
      toast.success("Embalagem removida");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function apply(box: PackagingBox) {
    setSelected(box.id);
    onApply({
      width_mm: br(box.width_mm),
      height_mm: br(box.height_mm),
      length_mm: br(box.length_mm),
      weight_kg: br(box.suggested_weight_kg),
    });
  }

  function startEdit(box: PackagingBox) {
    setMode("edit");
    setEditingId(box.id);
    setDraft({
      name: box.name,
      width_mm: br(box.width_mm),
      height_mm: br(box.height_mm),
      length_mm: br(box.length_mm),
      suggested_weight_kg: br(box.suggested_weight_kg),
    });
  }

  const current = boxes.find((b) => b.id === selected);

  return (
    <div className="rounded-lg border bg-surface-1 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Boxes className="h-4 w-4 text-primary" /> Embalagem cadastrada
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selected}
          disabled={isLoading}
          onChange={(e) => {
            const box = boxes.find((b) => b.id === e.target.value);
            if (box) apply(box);
            else setSelected("");
          }}
          className="h-9 min-w-[240px] flex-1 rounded-md border bg-surface-2 px-2 text-sm outline-none focus:border-primary/50"
        >
          <option value="">{isLoading ? "Carregando..." : "Selecione uma embalagem…"}</option>
          {boxes.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} — {br(b.width_mm)}×{br(b.height_mm)}×{br(b.length_mm)} mm
              {b.suggested_weight_kg != null ? ` · ${br(b.suggested_weight_kg)} kg` : ""}
            </option>
          ))}
        </select>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMode((m) => (m === "create" ? "none" : "create"));
            setEditingId(null);
            setDraft(EMPTY);
          }}
        >
          <Plus className="mr-1 h-3 w-3" /> Nova embalagem
        </Button>

        {current && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => startEdit(current)}
              title="Editar embalagem"
            >
              <Pencil className="mr-1 h-3 w-3" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeMut.mutate(current.id)}
              disabled={removeMut.isPending}
              title="Excluir embalagem do cadastro"
            >
              {removeMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Ao selecionar, as medidas e o peso sugerido preenchem a cotação de frete abaixo — o peso
        pode ser alterado à vontade. Use vírgula para decimais (ex.: 0,35 kg).
      </p>

      {mode !== "none" && (
        <div className="mt-3 space-y-2 rounded-md border bg-surface-2 p-3">
          <div className="text-xs font-medium uppercase text-muted-foreground">
            {mode === "edit" ? "Editar embalagem" : "Nova embalagem"}
          </div>
          <div className="grid gap-2 sm:grid-cols-5">
            <BoxField
              label="Nome"
              value={draft.name}
              onChange={(v) => setDraft((s) => ({ ...s, name: v }))}
              placeholder="Caixa 01"
            />
            <BoxField label="Largura (mm)" decimal value={draft.width_mm} onChange={(v) => setDraft((s) => ({ ...s, width_mm: v }))} />
            <BoxField label="Altura (mm)" decimal value={draft.height_mm} onChange={(v) => setDraft((s) => ({ ...s, height_mm: v }))} />
            <BoxField label="Comprimento (mm)" decimal value={draft.length_mm} onChange={(v) => setDraft((s) => ({ ...s, length_mm: v }))} />
            <BoxField label="Peso sugerido (kg)" decimal value={draft.suggested_weight_kg} onChange={(v) => setDraft((s) => ({ ...s, suggested_weight_kg: v }))} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              {saveMut.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {mode === "edit" ? "Salvar alterações" : "Salvar embalagem"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMode("none");
                setEditingId(null);
                setDraft(EMPTY);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Mantém apenas dígitos e uma vírgula decimal (padrão brasileiro). */
export function sanitizeDecimal(v: string): string {
  const only = v.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const [head, ...rest] = only.split(",");
  return rest.length ? `${head},${rest.join("")}` : head;
}

function BoxField({
  label,
  value,
  onChange,
  decimal,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  decimal?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase text-muted-foreground">{label}</span>
      <input
        type="text"
        inputMode={decimal ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(decimal ? sanitizeDecimal(e.target.value) : e.target.value)}
        placeholder={placeholder ?? "—"}
        className="mt-1 w-full rounded-md border bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-primary/50"
      />
    </label>
  );
}
