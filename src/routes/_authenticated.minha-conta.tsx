import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  User as UserIcon,
  Building2,
  MapPin,
  Package,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  getMyAccount,
  updateProfile,
  upsertCompany,
  deleteCompany,
  upsertAddress,
  deleteAddress,
} from "@/lib/account.functions";
import {
  maskCPF,
  maskCNPJ,
  maskCEP,
  maskPhone,
  onlyDigits,
  fetchViaCep,
} from "@/lib/account.validation";
import { listMyOrders, ORDER_STATUS_LABEL } from "@/lib/orders.functions";
import { listMyDesigns, listMyCustomOrderItems, deleteDesign } from "@/lib/labels.functions";
import { SHAPE_LABELS, type LabelShape } from "@/lib/labels/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/minha-conta")({
  head: () => ({
    meta: [
      { title: "Minha conta — Adeconex" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MinhaContaPage,
});

// ---------- helpers ----------
type Account = Awaited<ReturnType<typeof getMyAccount>>;
type Company = Account["companies"][number];
type Address = Account["addresses"][number];

// ============================================================
function MinhaContaPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["account", "me"],
    queryFn: () => getMyAccount(),
  });

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { redirect: undefined }, replace: true });
  };

  if (isLoading) {
    return (
      <div className="container-page py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="container-page py-16">
        <p className="text-sm text-destructive">
          Erro ao carregar sua conta: {error instanceof Error ? error.message : "desconhecido"}
        </p>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-xs">Minha conta</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Olá, {data.profile?.full_name?.split(" ")[0] || "cliente"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{data.email}</p>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="perfil"><UserIcon className="h-4 w-4 mr-1.5" />Perfil</TabsTrigger>
          <TabsTrigger value="empresas"><Building2 className="h-4 w-4 mr-1.5" />Empresas</TabsTrigger>
          <TabsTrigger value="enderecos"><MapPin className="h-4 w-4 mr-1.5" />Endereços</TabsTrigger>
          <TabsTrigger value="pedidos"><Package className="h-4 w-4 mr-1.5" />Pedidos</TabsTrigger>
          <TabsTrigger value="personalizado"><Sparkles className="h-4 w-4 mr-1.5" />Personalizado</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil"><PerfilTab account={data} /></TabsContent>
        <TabsContent value="empresas"><EmpresasTab account={data} /></TabsContent>
        <TabsContent value="enderecos"><EnderecosTab account={data} /></TabsContent>
        <TabsContent value="pedidos"><PedidosTab /></TabsContent>
        <TabsContent value="personalizado"><PersonalizadoTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// PERFIL
// ============================================================
function PerfilTab({ account }: { account: Account }) {
  const qc = useQueryClient();
  const p = account.profile;
  const [form, setForm] = useState({
    full_name: p?.full_name ?? "",
    customer_type: (p?.customer_type ?? "pf") as "pf" | "pj",
    cpf: p?.cpf ? maskCPF(p.cpf) : "",
    phone: p?.phone ? maskPhone(p.phone) : "",
    whatsapp: p?.whatsapp ? maskPhone(p.whatsapp) : "",
    birth_date: p?.birth_date ?? "",
  });

  const mut = useMutation({
    mutationFn: (data: typeof form) => updateProfile({ data }),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["account", "me"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados pessoais</CardTitle>
        <CardDescription>Essas informações são usadas em pedidos, notas fiscais e contato.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
        >
          <div className="sm:col-span-2">
            <Label>Tipo de cliente</Label>
            <Select
              value={form.customer_type}
              onValueChange={(v) => setForm({ ...form, customer_type: v as "pf" | "pj" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pf">Pessoa física</SelectItem>
                <SelectItem value="pj">Pessoa jurídica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input id="full_name" required value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          {form.customer_type === "pf" && (
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" required value={form.cpf} placeholder="000.000.000-00"
                onChange={(e) => setForm({ ...form, cpf: maskCPF(e.target.value) })} />
            </div>
          )}
          <div>
            <Label htmlFor="birth_date">Nascimento</Label>
            <Input id="birth_date" type="date" value={form.birth_date}
              onChange={(e) => setForm({ ...form, birth_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={form.phone} placeholder="(00) 0000-0000"
              onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input id="whatsapp" value={form.whatsapp} placeholder="(00) 90000-0000"
              onChange={(e) => setForm({ ...form, whatsapp: maskPhone(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ============================================================
// EMPRESAS
// ============================================================
function EmpresasTab({ account }: { account: Account }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Company | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteCompany({ data: { id } }),
    onSuccess: () => {
      toast.success("Empresa removida");
      qc.invalidateQueries({ queryKey: ["account", "me"] });
      setToDelete(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Cadastre empresas (CNPJ) para emissão de nota fiscal e faturamento PJ.
        </p>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4" /> Nova empresa
        </Button>
      </div>

      {account.companies.length === 0 ? (
        <EmptyState icon={Building2} title="Nenhuma empresa cadastrada"
          description="Adicione o CNPJ da sua empresa para comprar como pessoa jurídica." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {account.companies.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{c.legal_name}</p>
                      {c.is_default && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />Padrão
                        </Badge>
                      )}
                    </div>
                    {c.trade_name && <p className="text-sm text-muted-foreground">{c.trade_name}</p>}
                    <p className="mt-2 text-sm font-mono">{maskCNPJ(c.cnpj)}</p>
                    {c.email && <p className="text-xs text-muted-foreground mt-1">{c.email}</p>}
                    {c.phone && <p className="text-xs text-muted-foreground">{maskPhone(c.phone)}</p>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(c)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(c)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <CompanyDialog
          open={true}
          initial={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Endereços vinculados manterão os dados salvos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && del.mutate(toDelete.id)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CompanyDialog({
  open, initial, onClose,
}: { open: boolean; initial: Company | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    id: initial?.id,
    cnpj: initial ? maskCNPJ(initial.cnpj) : "",
    legal_name: initial?.legal_name ?? "",
    trade_name: initial?.trade_name ?? "",
    state_registration: initial?.state_registration ?? "",
    municipal_registration: initial?.municipal_registration ?? "",
    phone: initial?.phone ? maskPhone(initial.phone) : "",
    email: initial?.email ?? "",
    is_default: initial?.is_default ?? false,
  });

  const mut = useMutation({
    mutationFn: (data: typeof form) => upsertCompany({ data }),
    onSuccess: () => {
      toast.success("Empresa salva");
      qc.invalidateQueries({ queryKey: ["account", "me"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar empresa" : "Nova empresa"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
        >
          <div className="sm:col-span-2">
            <Label>CNPJ</Label>
            <Input required value={form.cnpj} placeholder="00.000.000/0000-00"
              onChange={(e) => setForm({ ...form, cnpj: maskCNPJ(e.target.value) })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Razão social</Label>
            <Input required value={form.legal_name}
              onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Nome fantasia</Label>
            <Input value={form.trade_name}
              onChange={(e) => setForm({ ...form, trade_name: e.target.value })} />
          </div>
          <div>
            <Label>Inscrição estadual</Label>
            <Input value={form.state_registration}
              onChange={(e) => setForm({ ...form, state_registration: e.target.value })} />
          </div>
          <div>
            <Label>Inscrição municipal</Label>
            <Input value={form.municipal_registration}
              onChange={(e) => setForm({ ...form, municipal_registration: e.target.value })} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={form.phone} placeholder="(00) 0000-0000"
              onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="sm:col-span-2 flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="text-sm font-medium">Empresa padrão</p>
              <p className="text-xs text-muted-foreground">Será selecionada automaticamente no checkout.</p>
            </div>
            <Switch checked={form.is_default}
              onCheckedChange={(v) => setForm({ ...form, is_default: v })} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// ENDEREÇOS
// ============================================================
function EnderecosTab({ account }: { account: Account }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Address | null>(null);
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<Address | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => deleteAddress({ data: { id } }),
    onSuccess: () => {
      toast.success("Endereço removido");
      qc.invalidateQueries({ queryKey: ["account", "me"] });
      setToDelete(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Cadastre endereços de entrega e cobrança. O padrão é usado no checkout.
        </p>
        <Button onClick={() => setCreating(true)} size="sm">
          <Plus className="h-4 w-4" /> Novo endereço
        </Button>
      </div>

      {account.addresses.length === 0 ? (
        <EmptyState icon={MapPin} title="Nenhum endereço cadastrado"
          description="Adicione um endereço para calcular frete e finalizar pedidos." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {account.addresses.map((a) => (
            <Card key={a.id}>
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-semibold truncate">{a.label || a.recipient_name}</p>
                      {a.is_default_shipping && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />Entrega
                        </Badge>
                      )}
                      {a.is_default_billing && (
                        <Badge variant="secondary" className="gap-1">
                          <Star className="h-3 w-3" />Cobrança
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.recipient_name}</p>
                    <p className="text-sm mt-2">
                      {a.street}, {a.number}
                      {a.complement ? ` — ${a.complement}` : ""}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {a.district} · {a.city}/{a.state} · CEP {maskCEP(a.zip)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setToDelete(a)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <AddressDialog
          open={true}
          initial={editing}
          companies={account.companies}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover endereço?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => toDelete && del.mutate(toDelete.id)}>
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AddressDialog({
  open, initial, companies, onClose,
}: {
  open: boolean;
  initial: Address | null;
  companies: Company[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    id: initial?.id,
    company_id: initial?.company_id ?? null,
    label: initial?.label ?? "",
    recipient_name: initial?.recipient_name ?? "",
    recipient_document: initial?.recipient_document ?? "",
    zip: initial?.zip ? maskCEP(initial.zip) : "",
    street: initial?.street ?? "",
    number: initial?.number ?? "",
    complement: initial?.complement ?? "",
    district: initial?.district ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    country: initial?.country ?? "BR",
    reference: initial?.reference ?? "",
    kind: (initial?.kind ?? "shipping") as "shipping" | "billing" | "both",
    is_default_shipping: initial?.is_default_shipping ?? false,
    is_default_billing: initial?.is_default_billing ?? false,
  });
  const [cepLoading, setCepLoading] = useState(false);

  // ViaCEP autofill
  useEffect(() => {
    const digits = onlyDigits(form.zip);
    if (digits.length !== 8) return;
    let cancelled = false;
    setCepLoading(true);
    fetchViaCep(digits).then((r) => {
      if (cancelled || !r) { setCepLoading(false); return; }
      setForm((prev) => ({
        ...prev,
        street: prev.street || r.logradouro || "",
        district: prev.district || r.bairro || "",
        city: prev.city || r.localidade || "",
        state: prev.state || (r.uf || "").toUpperCase(),
      }));
      setCepLoading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.zip]);

  const mut = useMutation({
    mutationFn: (data: typeof form) => upsertAddress({ data }),
    onSuccess: () => {
      toast.success("Endereço salvo");
      qc.invalidateQueries({ queryKey: ["account", "me"] });
      onClose();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar endereço" : "Novo endereço"}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-6"
          onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }}
        >
          <div className="sm:col-span-3">
            <Label>Identificação</Label>
            <Input value={form.label} placeholder="Casa, Escritório..."
              onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <Label>Tipo</Label>
            <Select value={form.kind}
              onValueChange={(v) => setForm({ ...form, kind: v as typeof form.kind })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shipping">Entrega</SelectItem>
                <SelectItem value="billing">Cobrança</SelectItem>
                <SelectItem value="both">Entrega e cobrança</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-4">
            <Label>Destinatário</Label>
            <Input required value={form.recipient_name}
              onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>CPF/CNPJ (opcional)</Label>
            <Input value={form.recipient_document}
              onChange={(e) => setForm({ ...form, recipient_document: e.target.value })} />
          </div>

          {companies.length > 0 && (
            <div className="sm:col-span-6">
              <Label>Vincular a empresa</Label>
              <Select
                value={form.company_id ?? "none"}
                onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— nenhuma —</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="sm:col-span-2">
            <Label>CEP</Label>
            <div className="relative">
              <Input required value={form.zip} placeholder="00000-000"
                onChange={(e) => setForm({ ...form, zip: maskCEP(e.target.value) })} />
              {cepLoading && (
                <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
          <div className="sm:col-span-4">
            <Label>Logradouro</Label>
            <Input required value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })} />
          </div>

          <div className="sm:col-span-2">
            <Label>Número</Label>
            <Input required value={form.number}
              onChange={(e) => setForm({ ...form, number: e.target.value })} />
          </div>
          <div className="sm:col-span-4">
            <Label>Complemento</Label>
            <Input value={form.complement}
              onChange={(e) => setForm({ ...form, complement: e.target.value })} />
          </div>

          <div className="sm:col-span-3">
            <Label>Bairro</Label>
            <Input required value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Cidade</Label>
            <Input required value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </div>
          <div>
            <Label>UF</Label>
            <Input required maxLength={2} value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase() })} />
          </div>

          <div className="sm:col-span-6">
            <Label>Ponto de referência</Label>
            <Input value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          </div>

          <div className="sm:col-span-3 flex items-center justify-between rounded-md border p-3">
            <p className="text-sm font-medium">Padrão para entrega</p>
            <Switch checked={form.is_default_shipping}
              onCheckedChange={(v) => setForm({ ...form, is_default_shipping: v })} />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between rounded-md border p-3">
            <p className="text-sm font-medium">Padrão para cobrança</p>
            <Switch checked={form.is_default_billing}
              onCheckedChange={(v) => setForm({ ...form, is_default_billing: v })} />
          </div>

          <DialogFooter className="sm:col-span-6">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar endereço
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// PEDIDOS
// ============================================================
function PedidosTab() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["orders", "me", "list"],
    queryFn: () => listMyOrders(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError) {
    return <p className="text-sm text-destructive">{error instanceof Error ? error.message : "Erro"}</p>;
  }
  const orders = data?.orders ?? [];
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Você ainda não tem pedidos"
        description="Quando o checkout for concluído, seus pedidos e o histórico aparecerão aqui."
        action={<Link to="/catalogo"><Button variant="outline">Ver catálogo</Button></Link>}
      />
    );
  }

  const brl = (n: number | string) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

  const tone = (s: string): "default" | "destructive" | "secondary" | "outline" => {
    if (s === "pago" || s === "entregue" || s === "arte_aprovada") return "default";
    if (s === "cancelado" || s === "estornado") return "destructive";
    if (s === "enviado" || s === "em_producao" || s === "em_preparacao") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-2">
      {orders.map((o: (typeof orders)[number]) => (
        <Link
          key={o.id}
          to="/pedido/$id"
          params={{ id: o.id }}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary"
        >
          <div className="min-w-0">
            <p className="font-medium">{o.order_number}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(o.created_at).toLocaleDateString("pt-BR", { dateStyle: "short" })}
              {o.shipping_carrier ? ` · ${o.shipping_carrier}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={tone(o.status)}>{ORDER_STATUS_LABEL[o.status]}</Badge>
            <span className="tabular-nums font-medium">{brl(o.total)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ============================================================
// PERSONALIZADO (artes, rascunhos e pedidos personalizados)
// ============================================================
const DRAFT_KEY = "adeconex:label-draft";

const brlFmt = (n: number | string) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(n) || 0);

function PersonalizadoTab() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<
    { design: { name: string; width_mm: number; height_mm: number; shape: LabelShape }; quantity: number; savedAt: string } | null
  >(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.design) setDraft(parsed);
    } catch {
      setDraft(null);
    }
  }, []);

  const designs = useQuery({ queryKey: ["label-designs"], queryFn: () => listMyDesigns() });
  const items = useQuery({
    queryKey: ["label-custom-orders"],
    queryFn: () => listMyCustomOrderItems(),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteDesign({ data: { id } }),
    onSuccess: () => {
      toast.success("Arte excluída");
      qc.invalidateQueries({ queryKey: ["label-designs"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  const orderItems = items.data ?? [];
  const savedDesigns = designs.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rascunho automático</CardTitle>
          <CardDescription>O editor salva sua arte em andamento neste navegador.</CardDescription>
        </CardHeader>
        <CardContent>
          {draft ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="min-w-0">
                <p className="font-medium">{draft.design.name || "Rascunho sem nome"}</p>
                <p className="text-xs text-muted-foreground">
                  {draft.design.width_mm} × {draft.design.height_mm} mm ·{" "}
                  {SHAPE_LABELS[draft.design.shape]} · {draft.quantity} un ·{" "}
                  {new Date(draft.savedAt).toLocaleString("pt-BR")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.localStorage.removeItem(DRAFT_KEY);
                    setDraft(null);
                  }}
                >
                  Descartar
                </Button>
                <Link to="/etiquetas/editor" search={{ design: undefined, produto: undefined }}>
                  <Button>Continuar rascunho</Button>
                </Link>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="Nenhum rascunho em andamento"
              description="Comece uma arte no editor e ela ficará salva automaticamente aqui."
              action={
                <Link to="/etiquetas/editor" search={{ design: undefined, produto: undefined }}>
                  <Button variant="outline">Abrir editor</Button>
                </Link>
              }
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas artes salvas</CardTitle>
          <CardDescription>Reabra no editor com as mesmas medidas, grade e formato.</CardDescription>
        </CardHeader>
        <CardContent>
          {designs.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : savedDesigns.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title="Você ainda não salvou nenhuma arte"
              description="As artes salvas no editor de etiquetas aparecem aqui."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {savedDesigns.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-muted">
                    {d.thumbnail ? (
                      <img src={d.thumbnail} alt={`Arte ${d.name}`} className="h-full w-full object-contain" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(d.width_mm)} × {Number(d.height_mm)} mm ·{" "}
                      {SHAPE_LABELS[(d.shape ?? "rect") as LabelShape]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Atualizada em {new Date(d.updated_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link to="/etiquetas/editor" search={{ design: d.id, produto: undefined }}>
                      <Button size="sm" variant="outline">Abrir</Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir arte"
                      onClick={() => del.mutate(d.id)}
                      disabled={del.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pedidos personalizados</CardTitle>
          <CardDescription>Pedidos com etiqueta personalizada, arte, quantidade e valor.</CardDescription>
        </CardHeader>
        <CardContent>
          {items.isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : orderItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title="Nenhum pedido personalizado ainda"
              description="Quando você comprar uma etiqueta personalizada, ela aparecerá aqui com a arte."
            />
          ) : (
            <div className="space-y-3">
              {orderItems.map((it) => (
                <div key={it.item_id} className="flex flex-wrap items-center gap-3 rounded-lg border p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded border bg-muted">
                    {it.thumbnail ? (
                      <img src={it.thumbnail} alt={`Arte do pedido ${it.order_number}`} className="h-full w-full object-contain" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{it.design_name || it.product_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Pedido {it.order_number} ·{" "}
                      {it.created_at ? new Date(it.created_at).toLocaleDateString("pt-BR") : ""}
                      {it.width_mm ? ` · ${it.width_mm} × ${it.height_mm} mm` : ""}
                      {it.material ? ` · ${it.material}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {it.quantity} un × {brlFmt(it.unit_price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {it.order_status && (
                      <Badge variant="outline">
                        {ORDER_STATUS_LABEL[it.order_status as keyof typeof ORDER_STATUS_LABEL] ?? it.order_status}
                      </Badge>
                    )}
                    <span className="tabular-nums font-medium">{brlFmt(it.subtotal)}</span>
                    <Link to="/pedido/$id" params={{ id: it.order_id }}>
                      <Button size="sm" variant="outline">Ver pedido</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Small helpers
// ============================================================
function EmptyState({
  icon: Icon, title, description, action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed py-12 px-6 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
