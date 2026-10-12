import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Mail, Send, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminListAppEmails, adminSaveAppEmail, adminResetAppEmail, adminSendTestAppEmail, adminListEmailLog,
} from "@/lib/app-emails.functions";
import { APP_EMAILS, interpolate, type AppEmailKey, type AppEmailTexts } from "@/lib/app-emails.shared";

export const Route = createFileRoute("/_authenticated/admin/emails")({
  head: () => ({ meta: [{ title: "E-mails automáticos — Admin Adeconex" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: EmailsAdmin,
});

const SAMPLE: Record<string, string> = {
  nome: "Maria", numero_pedido: "ADC-2026-000010", total: "R$ 164,95", link: "https://www.adeconex.com.br",
  transportadora: "Correios SEDEX", rastreio: "AB123456789BR", arquivo: "Driver Zebra ZD220",
  empresa: "Loja Exemplo", email: "maria@exemplo.com", telefone: "(27) 99999-0000", segmento: "Varejo", mensagem: "Gostaria de um orçamento.",
};

const STATUS_LABEL: Record<string, string> = { sent: "Enviado", failed: "Falhou", suppressed: "Bloqueado", disabled: "Desligado" };

function EmailsAdmin() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["admin", "app-emails"], queryFn: () => adminListAppEmails() });
  const [selected, setSelected] = useState<AppEmailKey>("boas-vindas");
  const current = list.data?.find((e) => e.key === selected);
  const [texts, setTexts] = useState<AppEmailTexts | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (current) { setTexts(current.texts); setEnabled(current.enabled); }
  }, [current?.key, current?.updated_at, current?.enabled]);

  const save = useMutation({
    mutationFn: () => adminSaveAppEmail({ data: { key: selected, enabled, texts: texts! } }),
    onSuccess: () => { toast.success("E-mail salvo"); qc.invalidateQueries({ queryKey: ["admin", "app-emails"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const reset = useMutation({
    mutationFn: () => adminResetAppEmail({ data: { key: selected } }),
    onSuccess: () => { toast.success("Textos padrão restaurados"); qc.invalidateQueries({ queryKey: ["admin", "app-emails"] }); },
  });
  const test = useMutation({
    mutationFn: () => adminSendTestAppEmail({ data: { key: selected } }),
    onSuccess: (r) => {
      if (r.status === "sent") toast.success("Teste enviado para o seu e-mail");
      else toast.error("Não foi possível enviar. Se o domínio ainda está em verificação, aguarde e tente de novo.");
      qc.invalidateQueries({ queryKey: ["admin", "email-log"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups = useMemo(() => {
    const g: Record<string, typeof APP_EMAILS> = {};
    APP_EMAILS.forEach((e) => { (g[e.group] ||= []).push(e); });
    return g;
  }, []);

  const set = (k: keyof AppEmailTexts) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setTexts((t) => (t ? { ...t, [k]: e.target.value } : t));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">E-mails automáticos</h1>
        <p className="text-sm text-muted-foreground">Edite os textos das mensagens que o site envia para clientes e para a equipe.</p>
      </div>
      <Tabs defaultValue="mensagens">
        <TabsList>
          <TabsTrigger value="mensagens">Mensagens</TabsTrigger>
          <TabsTrigger value="historico">Histórico de envios</TabsTrigger>
        </TabsList>
        <TabsContent value="mensagens">
          <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside className="space-y-4">
              {Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{group}</p>
                  {items.map((it) => {
                    const row = list.data?.find((r) => r.key === it.key);
                    return (
                      <button
                        key={it.key}
                        onClick={() => setSelected(it.key)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${selected === it.key ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
                      >
                        <span>{it.name}</span>
                        {row && !row.enabled ? <span className="text-xs opacity-70">desligado</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </aside>

            {current && texts ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-4 rounded-lg border bg-card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-semibold">{current.name}</h2>
                      <p className="text-sm text-muted-foreground">{current.when}</p>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={enabled} onCheckedChange={setEnabled} /> {enabled ? "Ligado" : "Desligado"}
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {current.variables.map((v) => <Badge key={v} variant="secondary" className="font-mono">{`{${v}}`}</Badge>)}
                  </div>
                  <Field label="Assunto"><Input value={texts.subject} onChange={set("subject")} /></Field>
                  <Field label="Título"><Input value={texts.heading} onChange={set("heading")} /></Field>
                  <Field label="Abertura"><Textarea rows={2} value={texts.intro} onChange={set("intro")} /></Field>
                  <Field label="Texto principal"><Textarea rows={5} value={texts.body} onChange={set("body")} /></Field>
                  <Field label="Texto do botão (vazio = sem botão)"><Input value={texts.cta_label} onChange={set("cta_label")} /></Field>
                  <Field label="Assinatura"><Input value={texts.closing} onChange={set("closing")} /></Field>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="h-4 w-4" /> Salvar</Button>
                    <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending}><Send className="h-4 w-4" /> Enviar teste para mim</Button>
                    <Button variant="ghost" onClick={() => reset.mutate()} disabled={reset.isPending}><RotateCcw className="h-4 w-4" /> Restaurar padrão</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">O rodapé com endereço e o link de "cancelar inscrição" são adicionados automaticamente.</p>
                </div>
                <Preview texts={texts} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="historico"><EmailLog /></TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label>{label}</Label>{children}</div>;
}

function Preview({ texts }: { texts: AppEmailTexts }) {
  const f = (s: string) => interpolate(s, SAMPLE);
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="mb-2 text-xs uppercase text-muted-foreground">Pré-visualização</p>
      <p className="mb-3 text-sm"><span className="text-muted-foreground">Assunto:</span> {f(texts.subject)}</p>
      <div className="overflow-hidden rounded-md border bg-background">
        <div className="bg-primary px-5 py-3 text-sm font-bold tracking-[0.2em] text-primary-foreground">ADECONEX</div>
        <div className="space-y-2 p-5 text-sm">
          {texts.heading ? <p className="text-lg font-semibold">{f(texts.heading)}</p> : null}
          {texts.intro ? <p>{f(texts.intro)}</p> : null}
          <p className="whitespace-pre-line text-muted-foreground">{f(texts.body)}</p>
          {texts.cta_label ? <span className="mt-2 inline-block rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground">{texts.cta_label}</span> : null}
          {texts.closing ? <p className="pt-3 text-muted-foreground">{texts.closing}</p> : null}
        </div>
      </div>
    </div>
  );
}

function EmailLog() {
  const [key, setKey] = useState("");
  const [days, setDays] = useState(30);
  const log = useQuery({
    queryKey: ["admin", "email-log", key, days],
    queryFn: () => adminListEmailLog({ data: { key: key || undefined, days } }),
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <select value={key} onChange={(e) => setKey(e.target.value)} className="rounded-md border bg-background px-3 py-2 text-sm">
          <option value="">Todos os e-mails</option>
          {APP_EMAILS.map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-md border bg-background px-3 py-2 text-sm">
          {[7, 30, 90].map((d) => <option key={d} value={d}>Últimos {d} dias</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="p-3">Data</th><th className="p-3">E-mail</th><th className="p-3">Destinatário</th><th className="p-3">Referência</th><th className="p-3">Situação</th></tr>
          </thead>
          <tbody>
            {(log.data ?? []).map((r: any) => (
              <tr key={r.id} className="border-t">
                <td className="p-3 whitespace-nowrap">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                <td className="p-3">{APP_EMAILS.find((e) => e.key === r.template_key)?.name ?? r.template_key}</td>
                <td className="p-3">{r.recipient}</td>
                <td className="p-3">{r.reference ?? "—"}</td>
                <td className="p-3">
                  <Badge variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
                  {r.error_message ? <p className="mt-1 max-w-xs truncate text-xs text-muted-foreground" title={r.error_message}>{r.error_message}</p> : null}
                </td>
              </tr>
            ))}
            {log.data && log.data.length === 0 ? (
              <tr><td colSpan={5} className="p-6 text-center text-muted-foreground"><Mail className="mx-auto mb-2 h-5 w-5" />Nenhum envio no período.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
