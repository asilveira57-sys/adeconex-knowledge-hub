import { useQueryClient } from "@tanstack/react-query";

export function parseNum(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseInt0(v: string): number | null {
  const n = parseNum(v);
  return n == null ? null : Math.round(n);
}

export function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export function nullable(v: string): string | null {
  const t = v.trim();
  return t === "" ? null : t;
}

/** Converte "2026-01-31T10:00:00Z" -> "2026-01-31T10:00" para <input type=datetime-local>. */
export function toLocalInput(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function useInvalidateProduct(productId: string) {
  const qc = useQueryClient();
  return async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "product-editor", productId] }),
      qc.invalidateQueries({ queryKey: ["admin", "product-preview", productId] }),
      qc.invalidateQueries({ queryKey: ["admin", "products"] }),
    ]);
  };
}

export function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "—"}
        className="mt-1 w-full rounded-md border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary/50"
      />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary/50"
      />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border bg-surface-1 px-3 py-2 text-sm outline-none focus:border-primary/50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CharCounter({ value, max }: { value: string; max: number }) {
  const len = value.trim().length;
  const state = len === 0 ? "muted" : len > max ? "over" : len > max * 0.85 ? "warn" : "ok";
  const cls =
    state === "over"
      ? "text-destructive"
      : state === "warn"
        ? "text-amber-600"
        : state === "ok"
          ? "text-emerald-600"
          : "text-muted-foreground";
  return (
    <span className={`text-[11px] tabular-nums ${cls}`}>
      {len}/{max} caracteres
    </span>
  );
}
