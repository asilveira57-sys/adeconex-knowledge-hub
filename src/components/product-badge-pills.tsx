import { cn } from "@/lib/utils";
import type { ProductBadge } from "@/lib/catalog.functions";

const TONE: Record<string, string> = {
  default: "bg-primary text-primary-foreground",
  primary: "bg-primary text-primary-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  secondary: "bg-secondary text-secondary-foreground",
  muted: "bg-muted text-muted-foreground",
  success: "bg-signal/15 text-signal",
  signal: "bg-signal/15 text-signal",
};

export function ProductBadgePills({
  badges,
  className,
  size = "sm",
}: {
  badges: ProductBadge[] | undefined | null;
  className?: string;
  size?: "sm" | "md";
}) {
  if (!badges || badges.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {badges.map((b) => (
        <span
          key={b.key}
          className={cn(
            "rounded-full font-mono uppercase tracking-[0.12em]",
            size === "sm" ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[11px]",
            TONE[b.color] ?? TONE.default,
          )}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
}
