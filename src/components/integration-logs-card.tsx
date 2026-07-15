import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  listIntegrationLogs,
  resendOrderIntegration,
} from "@/lib/integrations.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fmt = (d: string) =>
  new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "medium" });

export function IntegrationLogsCard({ orderId }: { orderId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["integration-logs", orderId],
    queryFn: () => listIntegrationLogs({ data: { orderId } }),
  });

  const resend = useMutation({
    mutationFn: () => resendOrderIntegration({ data: { orderId } }),
    onSuccess: (r) => {
      if (r.ok) toast.success("Pedido reenviado com sucesso");
      else toast.error(`Falha ao reenviar: ${r.error}`);
      qc.invalidateQueries({ queryKey: ["integration-logs", orderId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const logs = data?.logs ?? [];
  const last = logs[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Sistema interno (Olist)</CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => resend.mutate()}
          disabled={resend.isPending}
        >
          {resend.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Reenviar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhuma tentativa registrada ainda. O envio ocorre automaticamente
            quando o pagamento é confirmado.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {last.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium text-emerald-700">
                    Última tentativa: sucesso
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="font-medium text-destructive">
                    Última tentativa: falha
                  </span>
                </>
              )}
              <span className="text-muted-foreground">· {fmt(last.created_at)}</span>
            </div>
            <ol className="space-y-2 max-h-64 overflow-auto pr-1">
              {logs.map((l: any) => (
                <li
                  key={l.id}
                  className="rounded-md border border-border/60 bg-muted/30 p-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={l.success ? "default" : "destructive"}>
                        {l.success ? "OK" : "ERRO"}
                      </Badge>
                      {l.status_code && (
                        <span className="text-muted-foreground">
                          HTTP {l.status_code}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">{fmt(l.created_at)}</span>
                  </div>
                  {l.error_message && (
                    <p className="mt-1 text-destructive break-words">{l.error_message}</p>
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </CardContent>
    </Card>
  );
}
