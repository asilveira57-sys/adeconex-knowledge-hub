import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getCatalogStats } from "@/lib/admin.functions";
import { getSalesDashboard, type SalesDashboard } from "@/lib/dashboard.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  AlertTriangle, CheckCircle2, Clock, ImageOff, DollarSign, Package, Layers, Image as ImageIcon,
  FolderTree, Link2, ArrowUp, ArrowDown, MessageCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: DashboardPage,
});

const brl = (v: number | null | undefined) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const num = (v: number) => v.toLocaleString("pt-BR");
const pct = (v: number | null) => (v == null ? "—" : `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`);

const STATUS_LABEL: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento", pago: "Pago", em_preparacao: "Em preparação",
  aguardando_arte: "Aguardando arte", arte_aprovada: "Arte aprovada", em_producao: "Em produção",
  enviado: "Enviado", entregue: "Entregue", cancelado: "Cancelado", estornado: "Estornado",
};
const PAY_LABEL: Record<string, string> = { pix: "Pix", credit_card: "Cartão de crédito", debit_card: "Cartão de débito", boleto: "Boleto", other: "Outro", outro: "Outro" };

const PRESETS = [
  { key: "today", label: "Hoje", days: 0 },
  { key: "7", label: "7 dias", days: 7 },
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
] as const;

function rangeFor(days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (days > 0) start.setDate(start.getDate() - (days - 1));
  return { from: start.toISOString(), to: new Date(end.getTime() + 1).toISOString() };
}

function DashboardPage() {
  const [preset, setPreset] = useState<string>("30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const range = useMemo(() => {
    if (preset === "custom" && custom.from && custom.to) {
      const f = new Date(`${custom.from}T00:00:00`);
      const t = new Date(`${custom.to}T00:00:00`);
      t.setDate(t.getDate() + 1);
      return { from: f.toISOString(), to: t.toISOString() };
    }
    return rangeFor(PRESETS.find((p) => p.key === preset)?.days ?? 30);
  }, [preset, custom]);

  const q = useQuery({
    queryKey: ["admin", "sales-dashboard", range],
    queryFn: () => getSalesDashboard({ data: range }),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-xs">Visão geral</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Painel de vendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Visitas, pedidos e onde a venda se perde. Comparação com o período anterior.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <Button key={p.key} size="sm" variant={preset === p.key ? "default" : "outline"} onClick={() => setPreset(p.key)}>{p.label}</Button>
          ))}
          <Button size="sm" variant={preset === "custom" ? "default" : "outline"} onClick={() => setPreset("custom")}>Personalizado</Button>
          {preset === "custom" && (
            <div className="flex items-center gap-1">
              <Input type="date" className="h-8 w-36" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} />
              <span className="text-xs text-muted-foreground">até</span>
              <Input type="date" className="h-8 w-36" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} />
            </div>
          )}
        </div>
      </div>

      <Tabs defaultValue="vendas">
        <TabsList>
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="visitas">Visitas</TabsTrigger>
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="recuperar">Recuperar vendas</TabsTrigger>
          <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
        </TabsList>
        {q.isError && <p className="mt-4 text-sm text-destructive">Não foi possível carregar o painel: {(q.error as Error).message}</p>}
        {!q.data && !q.isError ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : q.data ? (
          <div className={q.isFetching ? "opacity-70 transition-opacity" : ""}>
            <TabsContent value="vendas"><SalesTab d={q.data} /></TabsContent>
            <TabsContent value="visitas"><VisitsTab d={q.data} /></TabsContent>
            <TabsContent value="produtos"><ProductsTab d={q.data} /></TabsContent>
            <TabsContent value="recuperar"><RecoveryTab d={q.data} /></TabsContent>
          </div>
        ) : null}
        <TabsContent value="catalogo"><CatalogTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function Delta({ cur, prev }: { cur: number | null; prev: number | null }) {
  if (cur == null || prev == null) return null;
  if (prev === 0) return cur > 0 ? <span className="text-xs text-muted-foreground">novo</span> : null;
  const d = (cur - prev) / prev;
  const up = d >= 0;
  return (
    <span className={`inline-flex items-center text-xs ${up ? "text-green-600" : "text-destructive"}`}>
      {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(d * 100).toFixed(0)}%
    </span>
  );
}

function Kpi({ label, value, hint, delta }: { label: string; value: string; hint?: string; delta?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-1"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{delta}{hint}</div>
      </CardContent>
    </Card>
  );
}

function BarList({ title, rows, fmt = num, labels }: { title: string; rows: { name: string; value: number }[]; fmt?: (v: number) => string; labels?: Record<string, string> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período.</p>}
        {rows.map((r) => (
          <div key={r.name} className="text-sm">
            <div className="flex justify-between gap-2"><span className="truncate">{labels?.[r.name] ?? r.name}</span><span className="tabular-nums text-muted-foreground">{fmt(r.value)}</span></div>
            <div className="mt-1 h-1.5 rounded bg-muted"><div className="h-1.5 rounded bg-primary" style={{ width: `${(r.value / max) * 100}%` }} /></div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, data, dataKey, fmt }: { title: string; data: any[]; dataKey: string; fmt: (v: number) => string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data.map((d) => ({ ...d, label: d.day.slice(8, 10) + "/" + d.day.slice(5, 7) }))}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" fontSize={11} tickLine={false} />
            <YAxis fontSize={11} tickLine={false} width={60} tickFormatter={(v) => fmt(v)} />
            <Tooltip formatter={(v: number) => fmt(v)} />
            <Area type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function SalesTab({ d }: { d: SalesDashboard }) {
  const s = d.sales;
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Faturamento pago" value={brl(s.revenue)} delta={<Delta cur={s.revenue} prev={s.prevRevenue} />} />
        <Kpi label="Pedidos gerados" value={num(s.orders)} delta={<Delta cur={s.orders} prev={s.prevOrders} />} />
        <Kpi label="Pedidos pagos" value={num(s.paidOrders)} delta={<Delta cur={s.paidOrders} prev={s.prevPaidOrders} />} hint={s.orders ? `${pct(s.paidOrders / s.orders)} dos pedidos` : undefined} />
        <Kpi label="Ticket médio" value={brl(s.avgTicket)} />
        <Kpi label="Conversão do site" value={pct(s.conversion)} hint="pagos ÷ visitantes únicos" />
        <Kpi label="Frete cobrado" value={brl(s.shippingTotal)} />
        <Kpi label="Cupons usados" value={num(s.couponUses)} hint={d.money ? `${brl(s.discountTotal)} em desconto` : undefined} />
        <Kpi label="Clientes novos" value={num(d.customers.newCustomers)} hint={`${d.customers.repeat} de ${d.customers.buyers} compradores já compraram antes`} />
      </div>
      {d.money && <ChartCard title="Faturamento pago por dia" data={s.byDay} dataKey="revenue" fmt={(v) => brl(v)} />}
      <Funnel d={d} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <BarList title="Pedidos por situação" rows={s.byStatus} labels={STATUS_LABEL} />
        <BarList title="Forma de pagamento (pagos)" rows={s.byPayment} labels={PAY_LABEL} />
        <BarList title="Transportadoras (pagos)" rows={s.byCarrier} />
        {d.customers.pfpj && (
          <BarList title="Faturamento PF x PJ" fmt={brl} rows={[
            { name: `Pessoa física (${d.customers.pfpj.pf.orders} pedidos)`, value: d.customers.pfpj.pf.revenue },
            { name: `Empresa (${d.customers.pfpj.pj.orders} pedidos)`, value: d.customers.pfpj.pj.revenue },
          ]} />
        )}
        <BarList title={d.money ? "Faturamento por estado" : "Pedidos por estado"} rows={d.customers.byState} fmt={d.money ? brl : num} />
      </div>
    </div>
  );
}

function Funnel({ d }: { d: SalesDashboard }) {
  const first = d.funnel[0]?.value || 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Funil de conversão</CardTitle>
        <p className="text-xs text-muted-foreground">Visitas e etapas contam sessões; pedidos contam pedidos do período. Onde a barra cai mais é onde o cliente desiste.</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {d.funnel.map((f, i) => {
          const prev = i > 0 ? d.funnel[i - 1].value : null;
          return (
            <div key={f.step} className="grid grid-cols-[160px_1fr_120px] items-center gap-3 text-sm">
              <span>{f.step}</span>
              <div className="h-6 rounded bg-muted"><div className="h-6 rounded bg-primary/80" style={{ width: `${first ? Math.max(1, (f.value / first) * 100) : 0}%` }} /></div>
              <span className="tabular-nums text-right">{num(f.value)} {prev ? <span className="text-xs text-muted-foreground">({pct(f.value / prev)})</span> : null}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function VisitsTab({ d }: { d: SalesDashboard }) {
  const v = d.visits;
  return (
    <div className="mt-4 space-y-4">
      {v.views === 0 && (
        <Card className="border-amber-200 bg-amber-50/50"><CardContent className="pt-6 text-sm">A contagem de visitas começou agora e passa a valer no site publicado. Os números aparecem conforme as pessoas navegam.</CardContent></Card>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Visitantes únicos" value={num(v.visitors)} delta={<Delta cur={v.visitors} prev={v.prevVisitors} />} />
        <Kpi label="Visitas (sessões)" value={num(v.sessions)} />
        <Kpi label="Páginas vistas" value={num(v.views)} hint={v.sessions ? `${(v.views / v.sessions).toFixed(1)} por visita` : undefined} />
        <Kpi label="Conversão" value={pct(d.sales.conversion)} hint="pagos ÷ visitantes" />
      </div>
      <ChartCard title="Visitantes únicos por dia" data={v.byDay} dataKey="visitors" fmt={num} />
      <div className="grid gap-4 md:grid-cols-3">
        <BarList title="Origem das visitas" rows={v.sources} />
        <BarList title="Aparelho" rows={v.devices} />
        <BarList title="Páginas mais vistas" rows={v.pages} />
      </div>
    </div>
  );
}

function ProductTable({ title, hint, rows, money }: { title: string; hint?: string; rows: SalesDashboard["products"]["topViewed"]; money: boolean }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-base">{title}</CardTitle>{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</CardHeader>
      <CardContent>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">Sem dados no período.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1">Produto</th><th className="text-right">Visitas</th><th className="text-right">Carrinho</th><th className="text-right">Vendidos</th>{money && <th className="text-right">Faturamento</th>}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-1.5 pr-2"><Link to="/admin/produtos/$id" params={{ id: r.id }} className="hover:underline">{r.name}</Link></td>
                  <td className="text-right tabular-nums">{num(r.views)}</td>
                  <td className="text-right tabular-nums">{num(r.carts)}</td>
                  <td className="text-right tabular-nums">{num(r.sold)}</td>
                  {money && <td className="text-right tabular-nums">{brl(r.revenue)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}

function ProductsTab({ d }: { d: SalesDashboard }) {
  const p = d.products;
  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <ProductTable title="Mais visitados" rows={p.topViewed} money={d.money} />
      <ProductTable title="Mais vendidos" rows={p.topSold} money={d.money} />
      <ProductTable title="Muito visitados e não vendidos" hint="Pelo menos 5 visitas e nenhuma venda: revise preço, fotos e descrição." rows={p.viewedNotSold} money={d.money} />
      <ProductTable title="Vão ao carrinho, mas não vendem" hint="Pode ser frete, prazo ou preço final." rows={p.cartNotSold} money={d.money} />
    </div>
  );
}

function waLink(phone: string | null, text: string) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  const full = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

function RecoveryTab({ d }: { d: SalesDashboard }) {
  const r = d.recovery;
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Carrinhos abandonados" value={num(r.abandonedCount)} hint="sem compra há +24h (últimos 60 dias)" />
        <Kpi label="Valor parado em carrinhos" value={brl(r.abandonedValue)} />
        <Kpi label="Pedidos sem pagamento" value={num(r.pendingCount)} hint="aguardando há +24h" />
        <Kpi label="Valor sem pagamento" value={brl(r.pendingValue)} />
      </div>
      {!d.money ? (
        <p className="text-sm text-muted-foreground">Você não tem permissão para ver os clientes e valores.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Pedidos aguardando pagamento</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {r.pending.length === 0 && <p className="text-sm text-muted-foreground">Nenhum pedido parado.</p>}
              {r.pending.map((o) => {
                const wa = waLink(o.phone, `Olá${o.name ? `, ${o.name.split(" ")[0]}` : ""}! Vi que o pedido ${o.order_number} na Adeconex ainda está aguardando pagamento. Posso ajudar a finalizar?`);
                return (
                  <div key={o.id} className="flex items-center justify-between gap-2 border-t pt-2 text-sm">
                    <div className="min-w-0">
                      <Link to="/admin/pedidos/$id" params={{ id: o.id }} className="font-medium hover:underline">{o.order_number}</Link>
                      <p className="truncate text-xs text-muted-foreground">{o.name ?? "Cliente"} · {new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{brl(o.total)}</span>
                      {wa && <Button asChild size="sm" variant="outline"><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a></Button>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Carrinhos abandonados</CardTitle><p className="text-xs text-muted-foreground">Apenas clientes logados (visitantes sem conta não têm contato salvo).</p></CardHeader>
            <CardContent className="space-y-2">
              {r.abandoned.length === 0 && <p className="text-sm text-muted-foreground">Nenhum carrinho abandonado.</p>}
              {r.abandoned.map((c) => {
                const wa = waLink(c.phone, `Olá${c.name ? `, ${c.name.split(" ")[0]}` : ""}! Vi que você deixou itens no carrinho da Adeconex. Posso ajudar com frete ou alguma dúvida?`);
                return (
                  <div key={c.id} className="flex items-center justify-between gap-2 border-t pt-2 text-sm">
                    <div className="min-w-0">
                      <Link to="/admin/clientes/$id" params={{ id: c.user_id }} className="font-medium hover:underline">{c.name ?? "Cliente sem nome"}</Link>
                      <p className="text-xs text-muted-foreground">{c.items} itens · {new Date(c.updated_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums">{brl(c.value)}</span>
                      {wa && <Button asChild size="sm" variant="outline"><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a></Button>}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function CatalogTab() {
  const { data } = useQuery({ queryKey: ["admin", "catalog-stats"], queryFn: () => getCatalogStats(), staleTime: 5 * 60_000 });
  if (!data) return <Skeleton className="mt-4 h-40" />;
  const cards = [
    { label: "Produtos totais", value: data.products, icon: Package },
    { label: "Publicados", value: data.published, icon: CheckCircle2 },
    { label: "Aguardando revisão", value: data.needsReview, icon: Clock },
    { label: "Importados (rascunho)", value: data.imported, icon: Clock },
    { label: "Sem imagem", value: data.missingImage, icon: ImageOff },
    { label: "Sem preço", value: data.missingPrice, icon: DollarSign },
    { label: "Variações", value: data.variants, icon: Layers },
    { label: "Imagens", value: data.images, icon: ImageIcon },
    { label: "Categorias", value: data.categories, icon: FolderTree },
    { label: "Redirects 301", value: data.redirects, icon: Link2 },
  ];
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-3xl font-semibold tabular-nums">{c.value.toLocaleString("pt-BR")}</div></CardContent>
          </Card>
        ))}
      </div>
      {(data.missingImage > 0 || data.missingPrice > 0) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="flex flex-row items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><CardTitle className="text-base">Itens que precisam de atenção</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.missingImage > 0 && <p>• <Link to="/admin/produtos" search={{ quality: "missing_image" } as never} className="font-medium underline">{data.missingImage} produtos sem imagem</Link></p>}
            {data.missingPrice > 0 && <p>• <Link to="/admin/produtos" search={{ quality: "missing_price" } as never} className="font-medium underline">{data.missingPrice} produtos sem preço</Link></p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
