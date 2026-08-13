import { BarChart3, Grid3X3, Maximize2, RotateCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SheetResult } from "@/lib/aleprint/sheet-calculator";

export function SheetResultPanel({ result }: { result: SheetResult }) {
  const { totalPieces, columns, rows, usagePercent, wastedArea, bestOrientation } = result;

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
            <span className="text-4xl font-bold text-primary tabular-nums">{totalPieces}</span>
            <p className="text-sm text-muted-foreground">peças por folha</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <span className="font-semibold tabular-nums">{columns}</span>
              <p className="text-xs text-muted-foreground">colunas</p>
            </div>
            <div className="rounded-md bg-muted/50 p-2 text-center">
              <span className="font-semibold tabular-nums">{rows}</span>
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
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(usagePercent, 100)}%` }} />
          </div>
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
            <span className="text-muted-foreground">Área perdida</span>
            <span className="tabular-nums">{(wastedArea / 100).toFixed(1)} cm²</span>
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
