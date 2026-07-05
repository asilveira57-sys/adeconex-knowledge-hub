import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  getEnrichmentQueue,
  bulkMigrateImages,
  bulkEnrichProducts,
} from "@/lib/enrichment.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ImageDown, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/enriquecimento")({
  head: () => ({ meta: [{ title: "Enriquecimento — Admin" }, { name: "robots", content: "noindex" }] }),
  component: EnrichmentPage,
});

function EnrichmentPage() {
  const router = useRouter();
  const queueFn = useServerFn(getEnrichmentQueue);
  const migrateFn = useServerFn(bulkMigrateImages);
  const enrichFn = useServerFn(bulkEnrichProducts);

  const { data: queue, isLoading, refetch } = useQuery({
    queryKey: ["enrichment-queue"],
    queryFn: () => queueFn(),
  });

  const [imgBatch, setImgBatch] = useState(10);
  const [aiBatch, setAiBatch] = useState(5);
  const [runningImg, setRunningImg] = useState(false);
  const [runningAi, setRunningAi] = useState(false);
  const [lastImg, setLastImg] = useState<{ productsProcessed: number; totalMigrated: number; totalFailed: number } | null>(null);
  const [lastAi, setLastAi] = useState<{ processed: number; ok: number; fail: number; errors: string[] } | null>(null);

  const runMigrate = async () => {
    setRunningImg(true);
    try {
      const res = await migrateFn({ data: { limit: imgBatch } });
      setLastImg(res);
      toast.success(`Migradas ${res.totalMigrated} imagens de ${res.productsProcessed} produtos`);
      refetch();
      router.invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunningImg(false);
    }
  };

  const runEnrich = async () => {
    setRunningAi(true);
    try {
      const res = await enrichFn({ data: { limit: aiBatch, status: "imported" } });
      setLastAi(res);
      if (res.ok > 0) toast.success(`Enriquecidos ${res.ok} de ${res.processed} produtos`);
      if (res.fail > 0) toast.warning(`${res.fail} falharam`);
      refetch();
      router.invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunningAi(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow text-xs text-muted-foreground">Fase 4</p>
        <h1 className="text-2xl font-semibold tracking-tight">Enriquecimento & mídia</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Migre imagens do domínio antigo para o Storage e enriqueça produtos com IA (descrições, SEO, FAQs).
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="Imagens pendentes" value={queue?.pendingImages ?? "—"} loading={isLoading} />
        <StatCard label="Produtos c/ imagens a migrar" value={queue?.productsWithUnmigrated ?? "—"} loading={isLoading} />
        <StatCard label="Pendentes de IA" value={queue?.pendingEnrichment ?? "—"} loading={isLoading} />
        <StatCard label="Enriquecidos" value={queue?.enriched ?? "—"} loading={isLoading} />
        <StatCard label="FAQs geradas" value={queue?.totalFaqs ?? "—"} loading={isLoading} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageDown className="h-5 w-5" /> Migração de mídia</CardTitle>
            <CardDescription>
              Baixa imagens dos URLs de origem e envia para o bucket privado <code>catalog-media</code>. Processe em lotes pequenos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Produtos por lote (1-50)</label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={imgBatch}
                  onChange={(e) => setImgBatch(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  disabled={runningImg}
                />
              </div>
              <Button onClick={runMigrate} disabled={runningImg}>
                {runningImg ? <Loader2 className="h-4 w-4 animate-spin" /> : "Processar lote"}
              </Button>
            </div>
            {lastImg && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Último lote
                </p>
                <p className="mt-1 text-muted-foreground">
                  {lastImg.productsProcessed} produtos • {lastImg.totalMigrated} migradas • {lastImg.totalFailed} falhas
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Enriquecimento IA</CardTitle>
            <CardDescription>
              Gera descrições, SEO e FAQs com <code>google/gemini-3-flash-preview</code>. Marca produto como <code>enriched</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground">Produtos por lote (1-20)</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={aiBatch}
                  onChange={(e) => setAiBatch(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  disabled={runningAi}
                />
              </div>
              <Button onClick={runEnrich} disabled={runningAi}>
                {runningAi ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enriquecer lote"}
              </Button>
            </div>
            {lastAi && (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-green-600" /> Último lote
                </p>
                <p className="text-muted-foreground">
                  {lastAi.processed} processados • {lastAi.ok} sucesso • {lastAi.fail} falhas
                </p>
                {lastAi.errors.length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-3 w-3" /> ver erros
                    </summary>
                    <ul className="mt-1 space-y-0.5 pl-4 list-disc">
                      {lastAi.errors.map((e, i) => (<li key={i} className="break-all">{e}</li>))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• A migração de mídia baixa cada URL de origem e salva em <code>products/&#123;id&#125;/&#123;imageId&#125;.&#123;ext&#125;</code>.</p>
          <p>• Como o bucket é privado (policy do workspace), o site público servirá imagens via URLs assinadas geradas sob demanda.</p>
          <p>• O enriquecimento IA usa a descrição técnica limpa + categorias como contexto e nunca inventa números — se faltar dado, gera texto genérico coerente.</p>
          <p>• FAQs antigas geradas por IA são substituídas a cada re-execução; FAQs marcadas como revisadas ficam preservadas somente se <code>is_ai_generated=false</code>.</p>
          <p>• Rode em lotes pequenos para evitar rate-limit do gateway (429) e monitorar custos.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, loading }: { label: string; value: number | string; loading: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{loading ? "…" : value}</p>
      </CardContent>
    </Card>
  );
}
