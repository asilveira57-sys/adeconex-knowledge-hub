import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Boxes, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listPackagingBoxes,
  createPackagingBox,
  deletePackagingBox,
  type PackagingBox,
} from "@/lib/packaging.functions";

export type PackagingApply = {
  width_mm: string;
  height_mm: string;
  length_mm: string;
  weight_kg: string;
};

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Caixa de seleção com as embalagens cadastradas.
 * Ao escolher, preenche largura/altura/comprimento e o peso sugerido
 * (que continua editável nos campos do formulário).
 */
export function PackagingPicker({ onApply }: { onApply: (v: PackagingApply) => void }) {
  const qc = useQueryClient();
  const list = useServerFn(listPackagingBoxes);
  const create = useServerFn(createPackagingBox);
  const remove = useServerFn(deletePackagingBox);

  const { data: boxes = [], isLoading } = useQuery({
    queryKey: ["admin", "packaging-boxes"],
    queryFn: () => list(),
  });

  const [selected, setSelected] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    width_mm: "",
    height_mm: "",
    length_mm: "",
    suggested_weight_kg: "",
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "packaging-boxes"] });

  const createMut = useMutation({
    mutationFn: async () => {
      const w = num(draft.width_mm);
      const h = num(draft.height_mm);
      const l = num(draft.length_mm);
      if (!draft.name.trim() || !w || !h || !l) {
        throw new Error("Informe nome, largura, altura e comprimento.");
      }
      return create({
        data: {
          name: draft.name.trim(),
          width_mm: w,
          height_mm: h,
          length_mm: l,
          suggested_weight_kg: num(draft.suggested_weight_kg),
          sort_order: boxes.length + 1,
        },
      });
    },
    onSuccess: async (box: PackagingBox) => {
      await invalidate();
      setShowForm(false);
      setDraft({ name: "", width_mm: "", height_mm: "", length_mm: "", suggested_weight_kg: "" });
      apply(box);
      toast.success("Embalagem cadastrada");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => remove({ data: { id } }),
    onSuccess: async () => {
      setSelected("");
      await invalidate();
      toast.success("Embalagem removida");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  function apply(box: PackagingBox) {
    setSelected(box.id);
    onApply({
      width_mm: String(box.width_mm),
      height_mm: String(box.height_mm),
      length_mm: String(box.length_mm),
      weight_kg: box.suggested_weight_kg != null ? String(box.suggested_weight_kg) : "",
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
              {b.name} — {b.width_mm}×{b.height_mm}×{b.length_mm} mm
              {b.suggested_weight_kg != null ? ` · ${b.suggested_weight_kg} kg` : ""}
            </option>
          ))}
        </select>

        <Button size="sm" variant="outline" onClick={() => setShowForm((s) => !s)}>
          <Plus className="mr-1 h-3 w-3" /> Nova embalagem
        </Button>

        {current && (
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
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        Ao selecionar, as medidas e o peso sugerido preenchem a cotação de frete abaixo — o peso
        pode ser alterado à vontade.
      </p>

      {showForm && (
        <div className="mt-3 space-y-2 rounded-md border bg-surface-2 p-3">
          <div className="grid gap-2 sm:grid-cols-5">
            <BoxField
              label="Nome"
              value={draft.name}
              onChange={(v) => setDraft((s) => ({ ...s, name: v }))}
              placeholder="Caixa 01"
            />
            <BoxField label="Largura (mm)" type="number" value={draft.width_mm} onChange={(v) => setDraft((s) => ({ ...s, width_mm: v }))} />
            <BoxField label="Altura (mm)" type="number" value={draft.height_mm} onChange={(v) => setDraft((s) => ({ ...s, height_mm: v }))} />
            <BoxField label="Comprimento (mm)" type="number" value={draft.length_mm} onChange={(v) => setDraft((s) => ({ ...s, length_mm: v }))} />
            <BoxField label="Peso sugerido (kg)" type="number" value={draft.suggested_weight_kg} onChange={(v) => setDraft((s) => ({ ...s, suggested_weight_kg: v }))} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Salvar embalagem
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function BoxField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase text-muted-foreground">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "—"}
        className="mt-1 w-full rounded-md border bg-surface-1 px-2 py-1.5 text-sm outline-none focus:border-primary/50"
      />
    </label>
  );
}
