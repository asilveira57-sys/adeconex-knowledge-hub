import { BarChart3, Grid3X3, Maximize2, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RollResult } from "@/lib/aleprint/roll-calculator";

export function RollResultPanel({ result }: { result: RollResult }) {
  const {
    totalItems,
    itemsPerRow,
    totalRows,
    usagePercent,
    usagePercentRoll,
    wastedArea,
    consumedLengthM,
    remainingLengthM,
    bestOrientation,
    unusableWidth,
  } = result;

  const usageColor =
    usagePercent >= 70 ? "text-emerald-600" : usagePercent >= 50 ? "text-amber-600" : "text-destructive";

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Grid3X3 className="h-4 w-4 text-primary" /> Resultado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center">
            <span className="text-4xl font-bold text-primary tabular-nums">{totalItems}</span>
            <p className="text-sm text-muted-foreground">itens por bobina</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <span className="font-semibold tabular-nums">{itemsPerRow}</span>
              <p className="text-xs text-muted-foreground">por linha</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <span className="font-semibold tabular-nums">{totalRows}</span>
              <p className="text-xs text-muted-foreground">linhas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" /> Aproveitamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-center">
            <span className={`text-3xl font-bold tabular-nums ${usageColor}`}>{usagePercent.toFixed(1)}%</span>
            <p className="text-xs text-muted-foreground">do material consumido</p>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {usagePercentRoll.toFixed(1)}% da bobina inteira
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Maximize2 className="h-4 w-4 text-primary" /> Detalhes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Consumo</span>
            <span className="tabular-nums">{consumedLengthM} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sobra da bobina</span>
            <span className="tabular-nums">{remainingLengthM} m</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Largura não usada</span>
            <span className="tabular-nums">{unusableWidth} mm</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Refugo no consumido</span>
            <span className="tabular-nums">{(wastedArea / 1_000_000).toFixed(3)} m²</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-muted-foreground">
              <RotateCw className="h-3 w-3" /> Orientação
            </span>
            <span>{bestOrientation === "normal" ? "Padrão" : "Rotacionado"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
