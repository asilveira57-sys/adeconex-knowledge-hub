import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { getSiteSettings, updateSiteSetting } from "@/lib/seo-central.functions";
import { BASE_URL } from "@/lib/seo";
import type {
  Ga4Config,
  GoogleAdsConfig,
  GtmConfig,
  MetaPixelConfig,
  SearchConsoleConfig,
  TrackingEnvironment,
} from "@/lib/seo-central.shared";
import { ENVIRONMENT_LABELS } from "@/lib/seo-central.shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/admin/product/fields";

export const Route = createFileRoute("/_authenticated/admin/seo/integracoes")({
  head: () => ({ meta: [{ title: "Integrações de Tracking — Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: IntegrationsPage,
});

const DEFAULTS = {
  ga4: { enabled: false, measurement_id: "", install_method: "gtag", environment: "production" } as Ga4Config,
  gtm: { enabled: false, container_id: "", ga4_via_gtm: false, environment: "production" } as GtmConfig,
  ads: { enabled: false, ads_id: "", conversions: [], environment: "production" } as GoogleAdsConfig,
  meta: { enabled: false, pixel_id: "", environment: "production" } as MetaPixelConfig,
  gsc: { verification_meta: "", property_domain: "", property_url_prefix: "" } as SearchConsoleConfig,
};

function IntegrationsPage() {
  const queryClient = useQueryClient();
  const update = useServerFn(updateSiteSetting);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site-settings"],
    queryFn: () => getSiteSettings(),
  });

  const [ga4, setGa4] = useState<Ga4Config>(DEFAULTS.ga4);
  const [gtm, setGtm] = useState<GtmConfig>(DEFAULTS.gtm);
  const [ads, setAds] = useState<GoogleAdsConfig>(DEFAULTS.ads);
  const [meta, setMeta] = useState<MetaPixelConfig>(DEFAULTS.meta);
  const [gsc, setGsc] = useState<SearchConsoleConfig>(DEFAULTS.gsc);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    if (data.integration_ga4) setGa4({ ...DEFAULTS.ga4, ...(data.integration_ga4 as any) });
    if (data.integration_gtm) setGtm({ ...DEFAULTS.gtm, ...(data.integration_gtm as any) });
    if (data.integration_google_ads) setAds({ ...DEFAULTS.ads, ...(data.integration_google_ads as any) });
    if (data.integration_meta_pixel) setMeta({ ...DEFAULTS.meta, ...(data.integration_meta_pixel as any) });
    if (data.integration_search_console) setGsc({ ...DEFAULTS.gsc, ...(data.integration_search_console as any) });
  }, [data]);

  async function save(key: string, value: unknown) {
    setSaving(key);
    try {
      await update({ data: { key, value: value as any } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["public-tracking-config"] });
      toast.success("Integração salva");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(null);
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const dupWarning = gtm.enabled && gtm.ga4_via_gtm && ga4.enabled && ga4.install_method === "gtag";

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrações de tracking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GA4, GTM, Google Ads, Meta Pixel e Search Console. Credenciais sensíveis (tokens de API) ficam em secrets do backend — nunca aqui.
        </p>
      </div>

      {dupWarning && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Atenção: o GA4 está ativo via gtag direto e também marcado como controlado pelo GTM. Isso duplicaria a medição. Ajuste o método de instalação do GA4 para "via GTM" ou desative uma das opções.
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            Google Analytics 4
            <Toggle checked={ga4.enabled} onChange={(v) => setGa4({ ...ga4, enabled: v })} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Measurement ID (G-XXXXXXX)" value={ga4.measurement_id} onChange={(v) => setGa4({ ...ga4, measurement_id: v.trim() })} hint="Vazio = usa o ID do conector Google Analytics do projeto, se existir." />
          <div className="grid gap-3 sm:grid-cols-2">
            <SelectField
              label="Método de instalação"
              value={ga4.install_method}
              onChange={(v) => setGa4({ ...ga4, install_method: v as Ga4Config["install_method"] })}
              options={[
                { value: "gtag", label: "Google Tag (gtag.js) direto" },
                { value: "gtm", label: "Via Google Tag Manager" },
              ]}
            />
            <EnvSelect value={ga4.environment} onChange={(v) => setGa4({ ...ga4, environment: v })} />
          </div>
          <SaveBtn saving={saving === "integration_ga4"} onClick={() => save("integration_ga4", ga4)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            Google Tag Manager
            <Toggle checked={gtm.enabled} onChange={(v) => setGtm({ ...gtm, enabled: v })} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Container ID (GTM-XXXXXXX)" value={gtm.container_id} onChange={(v) => setGtm({ ...gtm, container_id: v.trim() })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gtm.ga4_via_gtm} onChange={(e) => setGtm({ ...gtm, ga4_via_gtm: e.target.checked })} className="h-4 w-4" />
            GA4 é disparado dentro deste container GTM (não instalar gtag direto)
          </label>
          <EnvSelect value={gtm.environment} onChange={(v) => setGtm({ ...gtm, environment: v })} />
          <SaveBtn saving={saving === "integration_gtm"} onClick={() => save("integration_gtm", gtm)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            Google Ads
            <Toggle checked={ads.enabled} onChange={(v) => setAds({ ...ads, enabled: v })} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Google Ads ID (AW-XXXXXXX)" value={ads.ads_id} onChange={(v) => setAds({ ...ads, ads_id: v.trim() })} />
          <EnvSelect value={ads.environment} onChange={(v) => setAds({ ...ads, environment: v })} />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Conversões</p>
            {ads.conversions.map((c, i) => (
              <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field label="Nome" value={c.name} onChange={(v) => setAds({ ...ads, conversions: ads.conversions.map((x, j) => (j === i ? { ...x, name: v } : x)) })} />
                <Field label="Conversion ID" value={c.conversion_id} onChange={(v) => setAds({ ...ads, conversions: ads.conversions.map((x, j) => (j === i ? { ...x, conversion_id: v.trim() } : x)) })} />
                <Field label="Conversion Label" value={c.conversion_label} onChange={(v) => setAds({ ...ads, conversions: ads.conversions.map((x, j) => (j === i ? { ...x, conversion_label: v.trim() } : x)) })} />
                <Button size="sm" variant="outline" onClick={() => setAds({ ...ads, conversions: ads.conversions.filter((_, j) => j !== i) })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => setAds({ ...ads, conversions: [...ads.conversions, { name: "", conversion_id: "", conversion_label: "" }] })}>
              <Plus className="mr-1 h-3 w-3" /> Adicionar conversão
            </Button>
          </div>
          <SaveBtn saving={saving === "integration_google_ads"} onClick={() => save("integration_google_ads", ads)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-sm">
            Meta Pixel
            <Toggle checked={meta.enabled} onChange={(v) => setMeta({ ...meta, enabled: v })} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Pixel ID" value={meta.pixel_id} onChange={(v) => setMeta({ ...meta, pixel_id: v.trim() })} />
          <EnvSelect value={meta.environment} onChange={(v) => setMeta({ ...meta, environment: v })} />
          <p className="text-xs text-muted-foreground">
            Meta Conversions API (CAPI) será configurada na Fase 2 com token em secret de backend.
          </p>
          <SaveBtn saving={saving === "integration_meta_pixel"} onClick={() => save("integration_meta_pixel", meta)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Google Search Console</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Field
            label="Meta tag de verificação (somente o valor de content)"
            value={gsc.verification_meta}
            onChange={(v) => setGsc({ ...gsc, verification_meta: v.trim() })}
            hint="Aplicada automaticamente no <head> de todas as páginas."
          />
          <Field label="Propriedade de domínio" value={gsc.property_domain} onChange={(v) => setGsc({ ...gsc, property_domain: v.trim() })} hint="Ex.: sc-domain:adeconex.com.br" />
          <Field label="Propriedade por prefixo de URL" value={gsc.property_url_prefix} onChange={(v) => setGsc({ ...gsc, property_url_prefix: v.trim() })} />
          <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <span className="flex-1 truncate text-muted-foreground">Sitemap: {BASE_URL}/sitemap.xml</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${BASE_URL}/sitemap.xml`);
                toast.success("URL do sitemap copiada");
              }}
            >
              <Copy className="mr-1 h-3 w-3" /> Copiar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Integração via API oficial (cliques, impressões, CTR) está prevista para a Fase 3 — nenhum dado é simulado.
          </p>
          <SaveBtn saving={saving === "integration_search_console"} onClick={() => save("integration_search_console", gsc)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition-colors ${checked ? "bg-emerald-500" : "bg-muted"}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-4.5 left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      <select className="w-full rounded-md border bg-background px-2 py-1.5 text-sm" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function EnvSelect({ value, onChange }: { value: TrackingEnvironment; onChange: (v: TrackingEnvironment) => void }) {
  return (
    <SelectField
      label="Ambiente"
      value={value}
      onChange={(v) => onChange(v as TrackingEnvironment)}
      options={(Object.keys(ENVIRONMENT_LABELS) as TrackingEnvironment[]).map((k) => ({ value: k, label: ENVIRONMENT_LABELS[k] }))}
    />
  );
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <Button size="sm" onClick={onClick} disabled={saving}>
      {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
      Salvar
    </Button>
  );
}
