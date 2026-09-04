import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { getSiteSettings, updateSiteSetting } from "@/lib/seo-central.functions";
import type { LaunchNoticeConfig, SeoGeneralConfig, WhatsappButtonConfig, WhatsappScope } from "@/lib/seo-central.shared";
import { WHATSAPP_BUTTON_DEFAULTS, WHATSAPP_SCOPE_LABELS } from "@/lib/seo-central.shared";
import { Megaphone, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, TextAreaField, SelectField, CharCounter } from "@/components/admin/product/fields";

export const Route = createFileRoute("/_authenticated/admin/seo/configuracoes")({
  head: () => ({ meta: [{ title: "SEO — Configurações Gerais — Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SeoGeneralPage,
});

const EMPTY: SeoGeneralConfig = {
  site_name: "",
  company_name: "",
  site_url: "",
  canonical_domain: "",
  default_meta_title: "",
  default_meta_description: "",
  default_meta_keywords: "",
  default_og_image: "",
  language: "pt-BR",
  country: "BR",
  phone: "",
  whatsapp: "",
  email: "",
  social_instagram: "",
  social_youtube: "",
  social_linkedin: "",
  title_template_product: "{produto} | Adeconex Etiquetas",
  title_template_category: "{categoria} | Adeconex",
  title_template_post: "{titulo_post} | Adeconex",
};

function SeoGeneralPage() {
  const queryClient = useQueryClient();
  const update = useServerFn(updateSiteSetting);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site-settings"],
    queryFn: () => getSiteSettings(),
  });
  const [form, setForm] = useState<SeoGeneralConfig>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.seo_general) setForm({ ...EMPTY, ...(data.seo_general as any) });
  }, [data]);

  const set = (k: keyof SeoGeneralConfig, v: string) => setForm((s) => ({ ...s, [k]: v }));

  async function onSave() {
    setSaving(true);
    try {
      await update({ data: { key: "seo_general", value: form as any } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      toast.success("Configurações de SEO salvas");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações gerais de SEO</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Identidade do site, metadados padrão e modelos automáticos de título.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Identidade</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome do site" value={form.site_name} onChange={(v) => set("site_name", v)} />
          <Field label="Nome da empresa" value={form.company_name} onChange={(v) => set("company_name", v)} />
          <Field label="URL principal" value={form.site_url} onChange={(v) => set("site_url", v)} />
          <Field label="Domínio canônico" value={form.canonical_domain} onChange={(v) => set("canonical_domain", v)} />
          <Field label="Idioma padrão" value={form.language} onChange={(v) => set("language", v)} />
          <Field label="País" value={form.country} onChange={(v) => set("country", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Metadados padrão</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Field label="Meta Title padrão" value={form.default_meta_title} onChange={(v) => set("default_meta_title", v)} maxLength={200} />
            <CharCounter value={form.default_meta_title} max={60} />
          </div>
          <div>
            <TextAreaField label="Meta Description padrão" value={form.default_meta_description} onChange={(v) => set("default_meta_description", v)} rows={3} maxLength={400} />
            <CharCounter value={form.default_meta_description} max={160} />
          </div>
          <Field label="Meta Keywords padrão (legado)" value={form.default_meta_keywords} onChange={(v) => set("default_meta_keywords", v)} hint="Ignorado pelo Google; mantido apenas como recurso legado." />
          <Field label="Imagem Open Graph padrão (URL)" value={form.default_og_image} onChange={(v) => set("default_og_image", v)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Modelos de título automáticos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field label="Produto" value={form.title_template_product} onChange={(v) => set("title_template_product", v)} hint="Variável disponível: {produto}" />
          <Field label="Categoria" value={form.title_template_category} onChange={(v) => set("title_template_category", v)} hint="Variável disponível: {categoria}" />
          <Field label="Blog" value={form.title_template_post} onChange={(v) => set("title_template_post", v)} hint="Variável disponível: {titulo_post}" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Contato e redes sociais</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Field label="Telefone" value={form.phone} onChange={(v) => set("phone", v)} />
          <Field label="WhatsApp" value={form.whatsapp} onChange={(v) => set("whatsapp", v)} />
          <Field label="E-mail" value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Instagram" value={form.social_instagram} onChange={(v) => set("social_instagram", v)} />
          <Field label="YouTube" value={form.social_youtube} onChange={(v) => set("social_youtube", v)} />
          <Field label="LinkedIn" value={form.social_linkedin} onChange={(v) => set("social_linkedin", v)} />
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar configurações
      </Button>

      <LaunchNoticeCard settings={data ?? {}} />
      <WhatsappButtonCard settings={data ?? {}} />
    </div>
  );
}

function WhatsappButtonCard({ settings }: { settings: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const update = useServerFn(updateSiteSetting);
  const [form, setForm] = useState<WhatsappButtonConfig>(WHATSAPP_BUTTON_DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.whatsapp_button)
      setForm({ ...WHATSAPP_BUTTON_DEFAULTS, ...(settings.whatsapp_button as any) });
  }, [settings]);

  const toggleScope = (s: WhatsappScope) =>
    setForm((f) => ({
      ...f,
      scopes: f.scopes.includes(s) ? f.scopes.filter((x) => x !== s) : [...f.scopes, s],
    }));

  async function onSave() {
    const digits = form.phone.replace(/\D/g, "");
    if (form.enabled && digits.length < 12) return toast.error("Informe o número no formato internacional (ex.: 5527992733033)");
    setSaving(true);
    try {
      await update({ data: { key: "whatsapp_button", value: { ...form, phone: digits } as any } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["whatsapp-button-config"] });
      toast.success("Botão de WhatsApp atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageCircle className="h-4 w-4 text-primary" /> Botão flutuante de WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.checked }))} />
          Exibir botão de WhatsApp no site
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Número (formato internacional)"
            value={form.phone}
            onChange={(v) => setForm((s) => ({ ...s, phone: v }))}
            hint="Somente dígitos, ex.: 5527992733033"
          />
          <SelectField
            label="Posição inicial"
            value={form.initial_position}
            onChange={(v) => setForm((s) => ({ ...s, initial_position: v as WhatsappButtonConfig["initial_position"] }))}
            options={[
              { value: "bottom-right", label: "Canto inferior direito" },
              { value: "bottom-left", label: "Canto inferior esquerdo" },
            ]}
          />
        </div>
        <TextAreaField
          label="Mensagem inicial"
          value={form.message}
          onChange={(v) => setForm((s) => ({ ...s, message: v }))}
          rows={2}
          maxLength={400}
        />
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.draggable} onChange={(e) => setForm((s) => ({ ...s, draggable: e.target.checked }))} />
            Permitir arrastar
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.closable} onChange={(e) => setForm((s) => ({ ...s, closable: e.target.checked }))} />
            Permitir fechar
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Onde exibir</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(WHATSAPP_SCOPE_LABELS) as WhatsappScope[]).map((s) => (
              <label key={s} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.scopes.includes(s)} onChange={() => toggleScope(s)} />
                {WHATSAPP_SCOPE_LABELS[s]}
              </label>
            ))}
          </div>
        </div>
        {form.scopes.includes("selected") && (
          <TextAreaField
            label="Páginas selecionadas"
            value={form.selected_paths}
            onChange={(v) => setForm((s) => ({ ...s, selected_paths: v }))}
            rows={3}
            hint="Um caminho por linha, ex.: /contato"
          />
        )}
        <Button onClick={onSave} disabled={saving} variant="secondary">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Salvar botão de WhatsApp
        </Button>
      </CardContent>
    </Card>
  );
}


const NOTICE_EMPTY: LaunchNoticeConfig = { enabled: true, title: "", message: "" };

function LaunchNoticeCard({ settings }: { settings: Record<string, unknown> }) {
  const queryClient = useQueryClient();
  const update = useServerFn(updateSiteSetting);
  const [form, setForm] = useState<LaunchNoticeConfig>(NOTICE_EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings?.launch_notice) setForm({ ...NOTICE_EMPTY, ...(settings.launch_notice as any) });
  }, [settings]);

  async function onSave() {
    if (form.enabled && form.message.trim().length < 10) return toast.error("Escreva a mensagem do aviso");
    setSaving(true);
    try {
      await update({ data: { key: "launch_notice", value: form as any } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["launch-notice"] });
      toast.success("Pop-up de aviso atualizado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Megaphone className="h-4 w-4 text-primary" /> Pop-up de aviso de lançamento
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((s) => ({ ...s, enabled: e.target.checked }))}
          />
          Exibir pop-up ao abrir o site
        </label>
        <Field
          label="Título"
          value={form.title}
          onChange={(v) => setForm((s) => ({ ...s, title: v }))}
          maxLength={120}
        />
        <TextAreaField
          label="Mensagem"
          value={form.message}
          onChange={(v) => setForm((s) => ({ ...s, message: v }))}
          rows={4}
          maxLength={800}
          hint="Exibida uma vez por visitante. Ao alterar o texto, o pop-up volta a aparecer para todos."
        />
        <Button onClick={onSave} disabled={saving} variant="secondary">
          {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
          Salvar pop-up
        </Button>
      </CardContent>
    </Card>
  );
}
