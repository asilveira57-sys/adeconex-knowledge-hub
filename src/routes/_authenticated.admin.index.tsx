import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { getCatalogStats } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, ImageOff, DollarSign, Package, Layers, Image as ImageIcon, FolderTree, Link2 } from "lucide-react";

const statsOptions = queryOptions({
  queryKey: ["admin", "catalog-stats"],
  queryFn: () => getCatalogStats(),
  staleTime: 5 * 60_000, // stats mudam devagar
});

export const Route = createFileRoute("/_authenticated/admin/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(statsOptions),
  component: DashboardPage,
});

function DashboardPage() {
  const { data } = useSuspenseQuery(statsOptions);
  const cards = [
    { label: "Produtos totais", value: data.products, icon: Package, tone: "default" as const },
    { label: "Publicados", value: data.published, icon: CheckCircle2, tone: "success" as const },
    { label: "Aguardando revisão", value: data.needsReview, icon: Clock, tone: "warning" as const },
    { label: "Importados (rascunho)", value: data.imported, icon: Clock, tone: "default" as const },
    { label: "Sem imagem", value: data.missingImage, icon: ImageOff, tone: "warning" as const },
    { label: "Sem preço", value: data.missingPrice, icon: DollarSign, tone: "warning" as const },
    { label: "Variações", value: data.variants, icon: Layers, tone: "default" as const },
    { label: "Imagens", value: data.images, icon: ImageIcon, tone: "default" as const },
    { label: "Categorias", value: data.categories, icon: FolderTree, tone: "default" as const },
    { label: "Redirects 301", value: data.redirects, icon: Link2, tone: "default" as const },
  ];
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-xs">Visão geral</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Catálogo Adeconex 2030</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status da migração do site antigo e qualidade dos dados importados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.tone === "warning" ? "text-amber-500" : c.tone === "success" ? "text-green-500" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{c.value.toLocaleString("pt-BR")}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(data.missingImage > 0 || data.missingPrice > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Itens que precisam de atenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.missingImage > 0 && (
              <p>• <Link to="/admin/produtos" search={{ quality: "missing_image" } as never} className="font-medium underline">{data.missingImage} produtos sem imagem</Link> — impacto negativo em SEO e conversão.</p>
            )}
            {data.missingPrice > 0 && (
              <p>• <Link to="/admin/produtos" search={{ quality: "missing_price" } as never} className="font-medium underline">{data.missingPrice} produtos sem preço</Link> — não podem ser publicados sem correção.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
