import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getSeoCentralDashboard } from "@/lib/seo-central.functions";
import type { IntegrationStatus } from "@/lib/seo-central.shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  AlertTriangle,
  CircleOff,
  FileText,
  ImageOff,
  ArrowRightLeft,
  Globe2,
  Settings2,
  Plug,
  FileCode2,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/seo/")({
  head: () => ({ meta: [{ title: "Central de SEO & Tracking — Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SeoDashboardPage,
});

const statusMeta: Record<IntegrationStatus, { label: string; className: string; Icon: any }> = {
  connected: { label: "Conectado", className: "text-emerald-600", Icon: CheckCircle2 },
  attention: { label: "Atenção", className: "text-amber-600", Icon: AlertTriangle },
  not_configured: { label: "Não configurado", className: "text-muted-foreground", Icon: CircleOff },
};

const sections = [
  { to: "/admin/seo/configuracoes", label: "Configurações gerais", desc: "Identidade do site, metas padrão e modelos de título", Icon: Settings2 },
  { to: "/admin/seo/paginas", label: "SEO por página", desc: "Meta tags, robots, canonical, Open Graph e prévia do Google", Icon: FileText },
  { to: "/admin/seo/integracoes", label: "Integrações", desc: "GA4, GTM, Google Ads, Meta Pixel e Search Console", Icon: Plug },
  { to: "/admin/seo/redirecionamentos", label: "Redirecionamentos", desc: "Gerenciar 301/302 com detecção de loops", Icon: ArrowRightLeft },
  { to: "/admin/seo/tecnico", label: "SEO técnico", desc: "Robots.txt e sitemap.xml", Icon: FileCode2 },
] as const;

function SeoDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "seo-dashboard"],
    queryFn: () => getSeoCentralDashboard(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando central de SEO…</p>;
  if (error || !data) return <p className="text-sm text-destructive">Erro ao carregar: {(error as Error)?.message}</p>;

  const { integrations, metrics } = data;
  const m = metrics;
  const problems =
    m.products_without_title + m.products_without_description + m.categories_without_title + m.images_without_alt;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Central de SEO & Tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Status das integrações, saúde do SEO e acesso rápido às configurações.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {integrations.map((i) => {
          const s = statusMeta[i.status];
          return (
            <Card key={i.key}>
              <CardContent className="flex items-start gap-3 p-4">
                <s.Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.className}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{i.label}</p>
                  <p className={`text-xs font-medium ${s.className}`}>{s.label}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{i.detail}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Globe2} label="Páginas indexáveis" value={m.indexable_pages} />
        <MetricCard icon={ShieldCheck} label="Páginas noindex (gerenciadas)" value={m.seo_pages_noindex} />
        <MetricCard
          icon={FileText}
          label="Produtos sem Meta Title"
          value={m.products_without_title}
          tone={m.products_without_title > 0 ? "warn" : "ok"}
        />
        <MetricCard
          icon={FileText}
          label="Produtos sem Meta Description"
          value={m.products_without_description}
          tone={m.products_without_description > 0 ? "warn" : "ok"}
        />
        <MetricCard
          icon={FileText}
          label="Categorias sem Título SEO"
          value={m.categories_without_title}
          tone={m.categories_without_title > 0 ? "warn" : "ok"}
        />
        <MetricCard
          icon={ImageOff}
          label="Imagens sem ALT"
          value={m.images_without_alt}
          tone={m.images_without_alt > 0 ? "warn" : "ok"}
        />
        <MetricCard icon={ArrowRightLeft} label="Redirects ativos" value={`${m.active_redirects}/${m.total_redirects}`} />
        <MetricCard
          icon={AlertTriangle}
          label="Possíveis problemas de SEO"
          value={problems}
          tone={problems > 0 ? "warn" : "ok"}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Módulos da Central</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {sections.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="flex items-start gap-3 rounded-md border p-3 transition-colors hover:bg-accent"
            >
              <s.Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                <span className="block text-sm font-medium">{s.label}</span>
                <span className="block text-xs text-muted-foreground">{s.desc}</span>
              </span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number | string;
  tone?: "ok" | "warn";
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className={`h-5 w-5 ${tone === "warn" ? "text-amber-600" : tone === "ok" ? "text-emerald-600" : "text-muted-foreground"}`} />
        <div>
          <p className="text-xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
