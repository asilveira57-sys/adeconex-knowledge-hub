import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getImportLogs, getCatalogStats } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

const logsOptions = queryOptions({
  queryKey: ["admin", "import-logs"],
  queryFn: () => getImportLogs(),
});
const statsOptions = queryOptions({
  queryKey: ["admin", "catalog-stats"],
  queryFn: () => getCatalogStats(),
});

export const Route = createFileRoute("/_authenticated/admin/importacao")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(logsOptions),
    context.queryClient.ensureQueryData(statsOptions),
  ]),
  component: ImportPage,
});

function ImportPage() {
  const { data: logsData } = useSuspenseQuery(logsOptions);
  const { data: stats } = useSuspenseQuery(statsOptions);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-xs">Migração</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Importação de catálogo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórico de importações e status da migração TrayCommerce → Adeconex 2030.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Importação inicial concluída</AlertTitle>
        <AlertDescription>
          Fase 2 processou os 3 CSVs originais e criou {stats.products.toLocaleString("pt-BR")} produtos,{" "}
          {stats.variants} variações, {stats.images} imagens e {stats.redirects} redirects 301.
          Novas importações incrementais (upload de CSV pelo admin) serão adicionadas em uma iteração futura;
          por ora, reimportações são executadas via CLI para segurança.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Publicados</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{stats.published}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Importados (rascunho)</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{stats.imported}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Sem imagem / preço</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{stats.missingImage + stats.missingPrice}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {logsData.logs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum log registrado.</p>}
          {logsData.logs.map((log) => {
            const payload = (log.payload ?? {}) as Record<string, unknown>;
            return (
              <div key={log.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={log.status === "success" ? "default" : log.status === "warning" ? "secondary" : "destructive"}>
                    {log.status}
                  </Badge>
                  <span className="font-medium">{log.source_file ?? "—"}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{new Date(log.created_at).toLocaleString("pt-BR")}</span>
                </div>
                {log.message && <p className="mt-2 text-sm">{log.message}</p>}
                {Object.keys(payload).length > 0 && (
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 md:grid-cols-6">
                    {Object.entries(payload).map(([k, v]) => (
                      <div key={k}>
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="font-medium tabular-nums">{String(v)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
