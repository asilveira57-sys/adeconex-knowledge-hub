import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { listStaff, createStaff, updateStaff, removeStaff, setStaffPassword, STAFF_SECTIONS } from "@/lib/staff.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/admin/colaboradores")({
  head: () => ({
    meta: [
      { title: "Colaboradores — Administração Adeconex" },
      { name: "description", content: "Cadastro de colaboradores e permissões do painel Adeconex." },
      { property: "og:title", content: "Colaboradores — Administração Adeconex" },
      { property: "og:description", content: "Cadastro de colaboradores e permissões do painel Adeconex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ColaboradoresPage,
});

type Form = {
  userId?: string;
  name: string;
  email: string;
  password: string;
  role: "admin" | "editor";
  is_active: boolean;
  sections: string[];
  can_export_customers: boolean;
  can_export_orders: boolean;
  can_export_products: boolean;
};

const EMPTY: Form = {
  name: "", email: "", password: "", role: "editor", is_active: true,
  sections: ["dashboard", "pedidos", "clientes", "artes", "produtos"],
  can_export_customers: false, can_export_orders: false, can_export_products: true,
};

function ColaboradoresPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin", "staff"], queryFn: () => listStaff() });
  const [form, setForm] = useState<Form | null>(null);
  const [pwd, setPwd] = useState<{ userId: string; name: string; password: string } | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin", "staff"] });

  const save = useMutation({
    mutationFn: async (f: Form) => {
      const base = {
        name: f.name, role: f.role, is_active: f.is_active, sections: f.sections,
        can_export_customers: f.can_export_customers, can_export_orders: f.can_export_orders, can_export_products: f.can_export_products,
      };
      if (f.userId) return updateStaff({ data: { ...base, userId: f.userId } });
      return createStaff({ data: { ...base, email: f.email, password: f.password } });
    },
    onSuccess: () => { toast.success("Colaborador salvo"); setForm(null); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });
  const remove = useMutation({
    mutationFn: (userId: string) => removeStaff({ data: { userId } }),
    onSuccess: () => { toast.success("Acesso removido"); refresh(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });
  const pwdMut = useMutation({
    mutationFn: (p: { userId: string; password: string }) => setStaffPassword({ data: p }),
    onSuccess: () => { toast.success("Senha alterada"); setPwd(null); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Colaboradores</h1>
          <p className="text-sm text-muted-foreground">Quem acessa o painel, quais áreas vê e o que pode exportar.</p>
        </div>
        <Button onClick={() => setForm({ ...EMPTY })}><Plus className="h-4 w-4" /> Novo colaborador</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Carregando…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3">Nome</th><th className="p-3">Perfil</th><th className="p-3">Áreas</th>
                  <th className="p-3">Exportar</th><th className="p-3">Último acesso</th><th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(data?.staff ?? []).map((s) => (
                  <tr key={s.user_id} className="border-b last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant={s.role === "admin" ? "default" : "secondary"}>{s.role === "admin" ? "Administrador" : "Colaborador"}</Badge>
                      {!s.is_active && <Badge variant="destructive" className="ml-1">Inativo</Badge>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {s.role === "admin" ? "Todas" : STAFF_SECTIONS.filter((x) => s.sections.includes(x.key)).map((x) => x.label).join(", ")}
                    </td>
                    <td className="p-3 text-xs">
                      {s.role === "admin" ? "Tudo" : [
                        s.can_export_products && "Produtos",
                        s.can_export_customers && "Clientes",
                        s.can_export_orders && "Pedidos",
                      ].filter(Boolean).join(", ") || "Nada"}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{s.last_sign_in_at ? new Date(s.last_sign_in_at).toLocaleString("pt-BR") : "Nunca"}</td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" title="Editar" onClick={() => setForm({ ...EMPTY, ...s, userId: s.user_id, password: "", role: s.role as Form["role"] })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" title="Trocar senha" onClick={() => setPwd({ userId: s.user_id, name: s.name, password: "" })}><KeyRound className="h-4 w-4" /></Button>
                      {!s.is_self && (
                        <Button size="icon" variant="ghost" title="Remover acesso" onClick={() => { if (confirm(`Remover acesso de ${s.name} ao painel?`)) remove.mutate(s.user_id); }}><Trash2 className="h-4 w-4" /></Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form?.userId ? "Editar colaborador" : "Novo colaborador"}</DialogTitle></DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="space-y-1"><Label>Nome</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
              {!form.userId && (
                <>
                  <div className="space-y-1"><Label>E-mail de acesso</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
                  <div className="space-y-1"><Label>Senha inicial (mín. 8 caracteres)</Label><Input type="text" value={form.password} onChange={(e) => set("password", e.target.value)} /></div>
                </>
              )}
              <div className="flex items-center justify-between rounded-md border p-3">
                <div><p className="text-sm font-medium">Administrador</p><p className="text-xs text-muted-foreground">Acesso total, inclusive a esta tela.</p></div>
                <Switch checked={form.role === "admin"} onCheckedChange={(v) => set("role", v ? "admin" : "editor")} />
              </div>
              {form.role === "editor" && (
                <>
                  <div>
                    <p className="mb-2 text-sm font-medium">Áreas que pode acessar</p>
                    <div className="grid grid-cols-2 gap-2">
                      {STAFF_SECTIONS.map((sec) => (
                        <label key={sec.key} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={form.sections.includes(sec.key)}
                            onCheckedChange={(v) => set("sections", v ? [...form.sections, sec.key] : form.sections.filter((k) => k !== sec.key))}
                          />
                          {sec.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-medium">Pode exportar</p>
                    <div className="space-y-2">
                      {([
                        ["can_export_products", "Produtos"],
                        ["can_export_customers", "Clientes (CSV)"],
                        ["can_export_orders", "Pedidos (PDF)"],
                      ] as const).map(([k, l]) => (
                        <label key={k} className="flex items-center gap-2 text-sm">
                          <Checkbox checked={form[k]} onCheckedChange={(v) => set(k, !!v)} /> {l}
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between rounded-md border p-3">
                <p className="text-sm font-medium">Acesso ativo</p>
                <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button disabled={save.isPending} onClick={() => form && save.mutate(form)}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwd} onOpenChange={(o) => !o && setPwd(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova senha — {pwd?.name}</DialogTitle></DialogHeader>
          <Input type="text" placeholder="Mínimo 8 caracteres" value={pwd?.password ?? ""} onChange={(e) => setPwd((p) => (p ? { ...p, password: e.target.value } : p))} />
          <DialogFooter>
            <Button disabled={pwdMut.isPending} onClick={() => pwd && pwdMut.mutate({ userId: pwd.userId, password: pwd.password })}>Salvar senha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
