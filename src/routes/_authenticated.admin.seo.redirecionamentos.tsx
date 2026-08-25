import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import {
  listRedirectsAdmin,
  upsertRedirectAdmin,
  toggleRedirectAdmin,
  deleteRedirectAdmin,
} from "@/lib/seo-central.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/product/fields";

export const Route = createFileRoute("/_authenticated/admin/seo/redirecionamentos")({
  head: () => ({ meta: [{ title: "Redirecionamentos — Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: RedirectsPage,
});

type RedirectRow = {
  id: string;
  old_url: string;
  new_url: string;
  http_status: number | null;
  is_active: boolean | null;
  hits: number | null;
  notes: string | null;
  created_at: string | null;
};

function RedirectsPage() {
  const queryClient = useQueryClient();
  const upsert = useServerFn(upsertRedirectAdmin);
  const toggle = useServerFn(toggleRedirectAdmin);
  const remove = useServerFn(deleteRedirectAdmin);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "redirects"],
    queryFn: () => listRedirectsAdmin(),
  });
  const [form, setForm] = useState({ old_url: "", new_url: "", http_status: 301 as 301 | 302, notes: "" });
  const [busy, setBusy] = useState(false);

  const redirects = (data?.redirects ?? []) as RedirectRow[];

  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: ["admin", "redirects"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "seo-dashboard"] });
  }

  async function onCreate() {
    if (!form.old_url.trim() || !form.new_url.trim()) return toast.error("Preencha URL antiga e nova");
    setBusy(true);
    try {
      await upsert({ data: { old_url: form.old_url, new_url: form.new_url, http_status: form.http_status, notes: form.notes || undefined } });
      await invalidate();
      setForm({ old_url: "", new_url: "", http_status: 301, notes: "" });
      toast.success("Redirect criado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onToggle(r: RedirectRow) {
    try {
      await toggle({ data: { id: r.id, is_active: !(r.is_active !== false) } });
      await invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onDelete(id: string) {
    try {
      await remove({ data: { id } });
      await invalidate();
      toast.success("Redirect removido");
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Redirecionamentos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Redirects 301/302 servidos em produção. Loops são bloqueados automaticamente ao salvar.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_120px]">
            <Field label="URL antiga" value={form.old_url} onChange={(v) => setForm({ ...form, old_url: v })} />
            <Field label="URL nova" value={form.new_url} onChange={(v) => setForm({ ...form, new_url: v })} />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</span>
              <select
                className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={form.http_status}
                onChange={(e) => setForm({ ...form, http_status: Number(e.target.value) as 301 | 302 })}
              >
                <option value={301}>301 (permanente)</option>
                <option value={302}>302 (temporário)</option>
              </select>
            </label>
          </div>
          <Field label="Observação (interna)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
          <Button size="sm" onClick={onCreate} disabled={busy}>
            {busy ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Plus className="mr-1 h-3 w-3" />}
            Adicionar redirect
          </Button>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Origem</th>
              <th className="p-2">Destino</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Acessos</th>
              <th className="p-2">Status</th>
              <th className="p-2">Observação</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {redirects.length === 0 && (
              <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Nenhum redirect cadastrado.</td></tr>
            )}
            {redirects.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="max-w-[220px] truncate p-2 font-mono text-xs">{r.old_url}</td>
                <td className="max-w-[220px] truncate p-2 font-mono text-xs">{r.new_url}</td>
                <td className="p-2">{r.http_status ?? 301}</td>
                <td className="p-2 tabular-nums">{r.hits ?? 0}</td>
                <td className="p-2">
                  <button
                    onClick={() => onToggle(r)}
                    className={`rounded-full px-2 py-0.5 text-xs ${r.is_active !== false ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
                  >
                    {r.is_active !== false ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="max-w-[160px] truncate p-2 text-xs text-muted-foreground">{r.notes ?? "—"}</td>
                <td className="p-2">
                  <Button size="sm" variant="outline" onClick={() => onDelete(r.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
