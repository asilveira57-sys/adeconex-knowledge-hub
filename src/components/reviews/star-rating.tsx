import { useId, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

function StarShape({ fill, size, gradId }: { fill: 0 | 0.5 | 1; size: number; gradId: string }) {
  const d = "M12 2.5l2.95 6.1 6.55.95-4.75 4.6 1.12 6.55L12 17.6l-5.87 3.1 1.12-6.55L2.5 9.55l6.55-.95z";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id={gradId}>
          <stop offset="50%" stopColor="var(--star, hsl(38 92% 55%))" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d={d}
        fill={fill === 1 ? "var(--star, hsl(38 92% 55%))" : fill === 0.5 ? `url(#${gradId})` : "transparent"}
        stroke="var(--star, hsl(38 92% 55%))"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Estrelas somente leitura, com meias estrelas. */
export function Stars({ value, size = 16, className }: { value: number | null | undefined; size?: number; className?: string }) {
  const id = useId();
  const v = Math.round((value ?? 0) * 2) / 2;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-warning", className)} role="img" aria-label={`Nota ${String(v).replace(".", ",")} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarShape key={i} size={size} gradId={`${id}-${i}`} fill={v >= i ? 1 : v >= i - 0.5 ? 0.5 : 0} />
      ))}
    </span>
  );
}

/** Seletor de nota em passos de 0,5 (clique na metade esquerda = meia estrela). */
export function StarInput({ value, onChange, size = 36 }: { value: number; onChange: (v: number) => void; size?: number }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); onChange(Math.min(5, (value || 0) + 0.5)); }
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); onChange(Math.max(0.5, (value || 1) - 0.5)); }
  };
  return (
    <div className="flex flex-col gap-1">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Sua nota"
        aria-valuemin={0.5}
        aria-valuemax={5}
        aria-valuenow={value || undefined}
        aria-valuetext={value ? `${String(value).replace(".", ",")} de 5 estrelas` : "Sem nota"}
        onKeyDown={onKey}
        onMouseLeave={() => setHover(null)}
        className="inline-flex w-fit items-center gap-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="relative inline-block cursor-pointer" style={{ width: size, height: size }}>
            <StarShape size={size} gradId={`${id}-${i}`} fill={shown >= i ? 1 : shown >= i - 0.5 ? 0.5 : 0} />
            <button type="button" tabIndex={-1} aria-label={`${i - 0.5} estrelas`} className="absolute inset-y-0 left-0 w-1/2"
              onMouseEnter={() => setHover(i - 0.5)} onClick={() => onChange(i - 0.5)} />
            <button type="button" tabIndex={-1} aria-label={`${i} estrelas`} className="absolute inset-y-0 right-0 w-1/2"
              onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} />
          </span>
        ))}
      </div>
      <span className="text-sm text-muted-foreground tabular-nums">
        {shown ? `${String(shown).replace(".", ",")} de 5` : "Toque nas estrelas (meia estrela vale)"}
      </span>
    </div>
  );
}
