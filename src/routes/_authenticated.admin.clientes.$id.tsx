import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, KeyRound, Loader2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminCustomer,
  updateAdminCustomer,
  upsertAdminCompany,
  sendCustomerPasswordReset,
} from "@/lib/customers.functions";
import { ORDER_STATUS_LABEL } from "@/lib/orders.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Cadastro do cliente — Administração Adeconex" },
      { name: "description", content: "Dados, empresas, endereços e pedidos do cliente." },
      { property: "og:title", content: "Cadastro do cliente — Administração Adeconex" },
      { property: "og:description", content: "Dados, empresas, endereços e pedidos do cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ClientePage,
});

const brl = (n: number | string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);
const dt = (d?: string | null) => (d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—");
const err = (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro");

function F({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ClientePage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => getAdminCustomer({ data: { id } }),
  });

  const [p, setP] = useState({ full_name: "", email: "", customer_type: "pf" as "pf" | "pj", cpf: "", phone: "", whatsapp: "", birth_date: "" });
  useEffect(() => {
    if (!data) return;
    const pr: any = data.profile ?? {};
    setP({
      full_name: pr.full_name ?? "",
      email: data.user.email ?? "",
      customer_type: pr.customer_type ?? "pf",
      cpf: pr.cpf ?? "",
      phone: pr.phone ?? "",
      whatsapp: pr.whatsapp ?? "",
      birth_date: pr.birth_date ?? "",
    });
  }, [data]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin", "customer", id] });
    qc.invalidateQueries({ queryKey: ["admin", "customers"] });
  };

  const saveProfile = useMutation({
    mutationFn: () => updateAdminCustomer({ data: { id, ...p } }),
    onSuccess: () => { toast.success("Cadastro salvo"); refresh(); },
    onError: err,
  });
  const reset = useMutation({
    mutationFn: () => sendCustomerPasswordReset({ data: { id, redirectTo: `${window.location.origin}/redefinir-senha` } }),
    onSuccess: (r) => toast.success(`Link de redefinição enviado para ${r.email}`),
    onError: err,
  });

  if (isLoading || !data) return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const paid = data.orders.filter((o: any) => o.paid_at).reduce((s: number, o: any) => s + Number(o.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/admin/clientes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
            <ArrowLeft className="h-4 w-4" /> Clientes
          </Link>
          <h1 className="text-2xl font-semibold">{p.full_name || "(sem nome)"}</h1>
          <p className="text-sm text-muted-foreground">
            Cliente desde {dt(data.user.created_at)} · último acesso {dt(data.user.last_sign_in_at)} · login via {data.user.provider}
          </p>
        </div>
        <Button variant="outline" onClick={() => reset.mutate()} disabled={reset.isPending || !data.user.email}>
          {reset.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Enviar redefinição de senha
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Dados do cliente</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <F label="Nome completo" value={p.full_name} onChange={(v) => setP({ ...p, full_name: v })} />
            <F label="E-mail de acesso" type="email" value={p.email} onChange={(v) => setP({ ...p, email: v })} />
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={p.customer_type} onValueChange={(v) => setP({ ...p, customer_type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pf">Pessoa física</SelectItem>
                  <SelectItem value="pj">Pessoa jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <F
              label={p.customer_type === "pj" ? "CPF do responsável (opcional)" : "CPF"}
              value={p.cpf}
              placeholder="Somente números"
              onChange={(v) => setP({ ...p, cpf: v })}
            />
            <F label="Telefone" value={p.phone} onChange={(v) => setP({ ...p, phone: v })} />
            <F label="WhatsApp" value={p.whatsapp} onChange={(v) => setP({ ...p, whatsapp: v })} />
            <F label="Data de nascimento" type="date" value={p.birth_date} onChange={(v) => setP({ ...p, birth_date: v })} />
            <div className="flex items-end">
              <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
                {saveProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar cadastro
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Pedidos</span><b>{data.orders.length}</b></div>
            <div className="flex justify-between"><span>Total pago</span><b>{brl(paid)}</b></div>
            <div className="flex justify-between"><span>E-mail confirmado</span><b>{data.user.email_confirmed_at ? "Sim" : "Não"}</b></div>
            <div className="flex flex-wrap gap-1 pt-2">
              {!p.cpf && <Badge variant="destructive">Sem CPF</Badge>}
              {p.customer_type === "pj" && data.companies.length === 0 && <Badge variant="destructive">Sem CNPJ</Badge>}
              {!p.phone && !p.whatsapp && <Badge variant="destructive">Sem telefone</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      <CompaniesCard userId={id} companies={data.companies} onSaved={refresh} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Endereços</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.addresses.length === 0 && <p className="text-muted-foreground">Nenhum endereço cadastrado.</p>}
            {data.addresses.map((a: any) => (
              <div key={a.id} className="rounded-md border p-3">
                <div className="font-medium">{a.label || a.recipient_name} {a.is_default_shipping && <Badge variant="secondary">Padrão</Badge>}</div>
                <div>{a.street}, {a.number}{a.complement ? ` - ${a.complement}` : ""}</div>
                <div>{a.district} · {a.city}/{a.state} · CEP {a.zip}</div>
                {a.recipient_document && <div className="text-xs text-muted-foreground">Documento: {a.recipient_document}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pedidos</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.orders.length === 0 && <p className="text-muted-foreground">Nenhum pedido.</p>}
            {data.orders.map((o: any) => (
              <Link key={o.id} to="/admin/pedidos/$id" params={{ id: o.id }} className="flex items-center justify-between rounded-md border p-2 hover:bg-muted/50">
                <div>
                  <div className="font-medium">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground">{dt(o.created_at)}</div>
                </div>
                <div className="text-right">
                  <div>{brl(o.total)}</div>
                  <Badge variant="outline">{(ORDER_STATUS_LABEL as any)[o.status] ?? o.status}</Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type Co = { id?: string; cnpj: string; legal_name: string; trade_name: string; state_registration: string; municipal_registration: string; phone: string; email: string };
const emptyCo: Co = { cnpj: "", legal_name: "", trade_name: "", state_registration: "", municipal_registration: "", phone: "", email: "" };

function CompaniesCard({ userId, companies, onSaved }: { userId: string; companies: any[]; onSaved: () => void }) {
  const [adding, setAdding] = useState(false);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Empresas (CNPJ)</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Adicionar empresa</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {companies.length === 0 && !adding && <p className="text-sm text-muted-foreground">Nenhuma empresa cadastrada.</p>}
        {companies.map((c) => (
          <CompanyForm key={c.id} userId={userId} initial={Object.fromEntries(Object.keys(emptyCo).concat("id").map((k) => [k, c[k] ?? ""])) as Co} onSaved={onSaved} />
        ))}
        {adding && <CompanyForm userId={userId} initial={emptyCo} onSaved={() => { setAdding(false); onSaved(); }} />}
      </CardContent>
    </Card>
  );
}

function CompanyForm({ userId, initial, onSaved }: { userId: string; initial: Co; onSaved: () => void }) {
  const [c, setC] = useState<Co>(initial);
  const save = useMutation({
    mutationFn: () => upsertAdminCompany({ data: { ...c, id: c.id || undefined, user_id: userId } }),
    onSuccess: () => { toast.success("Empresa salva"); onSaved(); },
    onError: err,
  });
  const f = (k: keyof Co) => (v: string) => setC({ ...c, [k]: v });
  return (
    <div className="grid gap-3 rounded-md border p-3 sm:grid-cols-3">
      <F label="CNPJ" value={c.cnpj} onChange={f("cnpj")} />
      <F label="Razão social" value={c.legal_name} onChange={f("legal_name")} />
      <F label="Nome fantasia" value={c.trade_name} onChange={f("trade_name")} />
      <F label="Inscrição estadual" value={c.state_registration} onChange={f("state_registration")} />
      <F label="Inscrição municipal" value={c.municipal_registration} onChange={f("municipal_registration")} />
      <F label="Telefone" value={c.phone} onChange={f("phone")} />
      <F label="E-mail financeiro" value={c.email} onChange={f("email")} />
      <div className="flex items-end">
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar empresa
        </Button>
      </div>
    </div>
  );
}
