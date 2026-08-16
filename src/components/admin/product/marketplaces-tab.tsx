import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMarketplaceSettings,
  updateMarketplaceSettings,
  updateProductMarketplace,
} from "@/lib/admin.product.functions";
import {
  DEFAULT_MARKETPLACE_SETTINGS,
  mercadoLivreUrl,
  shopeeUrl,
  type MarketplaceSettings,
} from "@/lib/marketplaces";
import { Field, nullable, str, useInvalidateProduct } from "./fields";

export function MarketplacesTab({ product }: { product: any }) {
  const loadSettings = useServerFn(getMarketplaceSettings);
  const saveSettings = useServerFn(updateMarketplaceSettings);
  const saveProduct = useServerFn(updateProductMarketplace);
  const invalidate = useInvalidateProduct(product.id);

  const settingsQuery = useQuery({
    queryKey: ["admin", "marketplace-settings"],
    queryFn: () => loadSettings({}),
    staleTime: 60_000,
  });
  const settings: MarketplaceSettings = {
    ...DEFAULT_MARKETPLACE_SETTINGS,
    ...((settingsQuery.data ?? {}) as Partial<MarketplaceSettings>),
  };

  const [prod, setProd] = useState({
    ml_enabled: product.ml_enabled !== false,
    ml_search_term: str(product.ml_search_term),
    ml_url: str(product.ml_url),
    shopee_enabled: product.shopee_enabled !== false,
    shopee_search_term: str(product.shopee_search_term),
    shopee_url: str(product.shopee_url),
  });
  const [savingProduct, setSavingProduct] = useState(false);

  const [store, setStore] = useState<MarketplaceSettings | null>(null);
  const form = store ?? settings;
  const [savingStore, setSavingStore] = useState(false);

  const previewUrl = mercadoLivreUrl(
    {
      name: product.name,
      ml_search_term: prod.ml_search_term || null,
      ml_url: prod.ml_url || null,
      ml_enabled: prod.ml_enabled,
    },
    form,
  );

  const shopeePreviewUrl = shopeeUrl(
    {
      name: product.name,
      shopee_search_term: prod.shopee_search_term || null,
      shopee_url: prod.shopee_url || null,
      shopee_enabled: prod.shopee_enabled,
    },
    form,
  );

  async function onSaveProduct() {
    setSavingProduct(true);
    try {
      await saveProduct({
        data: {
          productId: product.id,
          ml_enabled: prod.ml_enabled,
          ml_search_term: nullable(prod.ml_search_term),
          ml_url: nullable(prod.ml_url),
          shopee_enabled: prod.shopee_enabled,
          shopee_search_term: nullable(prod.shopee_search_term),
          shopee_url: nullable(prod.shopee_url),
        },
      });
      await invalidate();
      toast.success("Marketplace do produto salvo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingProduct(false);
    }
  }

  async function onSaveStore() {
    setSavingStore(true);
    try {
      await saveSettings({
        data: {
          ml_enabled: form.ml_enabled,
          ml_store_slug: form.ml_store_slug,
          ml_search_url_template: form.ml_search_url_template,
          ml_store_url: form.ml_store_url || null,
          ml_button_label: form.ml_button_label,
          shopee_enabled: form.shopee_enabled,
          shopee_store_slug: form.shopee_store_slug,
          shopee_search_url_template: form.shopee_search_url_template,
          shopee_store_url: form.shopee_store_url || null,
          shopee_button_label: form.shopee_button_label,
        },
      });
      await settingsQuery.refetch();
      setStore(null);
      toast.success("Configuração da loja oficial salva");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSavingStore(false);
    }
  }

  const setForm = (patch: Partial<MarketplaceSettings>) => setStore({ ...form, ...patch });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mercado Livre neste produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prod.ml_enabled}
              onChange={(e) => setProd((s) => ({ ...s, ml_enabled: e.target.checked }))}
            />
            Exibir botão "{form.ml_button_label}" na página deste produto
          </label>

          <Field
            label="Termo de busca (opcional)"
            value={prod.ml_search_term}
            onChange={(v) => setProd((s) => ({ ...s, ml_search_term: v }))}
            maxLength={200}
            hint="Se vazio, usamos o título do produto. A busca é feita dentro da loja oficial Adeconex."
          />
          <Field
            label="Link direto do anúncio (opcional)"
            value={prod.ml_url}
            onChange={(v) => setProd((s) => ({ ...s, ml_url: v }))}
            hint="Use apenas em exceções: anúncios mudam de rota, viram catálogo e pausam. Preenchido, ele substitui a busca."
          />

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="mb-1 font-medium">Link que o cliente vai abrir</p>
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {previewUrl} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="text-muted-foreground">Botão desativado para este produto.</span>
            )}
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Shopee neste produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prod.shopee_enabled}
              onChange={(e) => setProd((s) => ({ ...s, shopee_enabled: e.target.checked }))}
            />
            Exibir botão "{form.shopee_button_label}" na página deste produto
          </label>

          <Field
            label="Termo de busca (opcional)"
            value={prod.shopee_search_term}
            onChange={(v) => setProd((s) => ({ ...s, shopee_search_term: v }))}
            maxLength={200}
            hint="Se vazio, usamos o título do produto. A busca é feita dentro da loja oficial Adeconex na Shopee."
          />
          <Field
            label="Link direto do anúncio (opcional)"
            value={prod.shopee_url}
            onChange={(v) => setProd((s) => ({ ...s, shopee_url: v }))}
            hint="Use apenas em exceções. Preenchido, ele substitui a busca."
          />

          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <p className="mb-1 font-medium">Link que o cliente vai abrir</p>
            {shopeePreviewUrl ? (
              <a
                href={shopeePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                {shopeePreviewUrl} <ExternalLink className="h-3 w-3 shrink-0" />
              </a>
            ) : (
              <span className="text-muted-foreground">Botão desativado para este produto.</span>
            )}
          </div>

          <Button onClick={onSaveProduct} disabled={savingProduct}>
            {savingProduct ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Salvar marketplaces do produto
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Lojas oficiais (vale para todos os produtos)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.ml_enabled}
              onChange={(e) => setForm({ ml_enabled: e.target.checked })}
            />
            Mercado Livre ativo no site
          </label>
          <Field
            label="Identificador da loja oficial"
            value={form.ml_store_slug}
            onChange={(v) => setForm({ ml_store_slug: v })}
            hint="Usado no filtro _Loja_ da busca do Mercado Livre."
          />
          <Field
            label="Modelo da URL de busca"
            value={form.ml_search_url_template}
            onChange={(v) => setForm({ ml_search_url_template: v })}
            hint="Use {q} para o termo e {store} para a loja."
          />
          <Field
            label="URL da loja oficial (fallback)"
            value={str(form.ml_store_url)}
            onChange={(v) => setForm({ ml_store_url: v })}
          />
          <Field
            label="Texto do botão"
            value={form.ml_button_label}
            onChange={(v) => setForm({ ml_button_label: v })}
            maxLength={60}
          />
          <div className="border-t pt-3" />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.shopee_enabled}
              onChange={(e) => setForm({ shopee_enabled: e.target.checked })}
            />
            Shopee ativa no site
          </label>
          <Field
            label="Identificador da loja oficial na Shopee"
            value={form.shopee_store_slug}
            onChange={(v) => setForm({ shopee_store_slug: v })}
            hint="Nome de usuário/ID da loja usado no filtro de busca da Shopee."
          />
          <Field
            label="Modelo da URL de busca (Shopee)"
            value={form.shopee_search_url_template}
            onChange={(v) => setForm({ shopee_search_url_template: v })}
            hint="Use {q} para o termo e {store} para a loja."
          />
          <Field
            label="URL da loja oficial na Shopee (fallback)"
            value={str(form.shopee_store_url)}
            onChange={(v) => setForm({ shopee_store_url: v })}
          />
          <Field
            label="Texto do botão (Shopee)"
            value={form.shopee_button_label}
            onChange={(v) => setForm({ shopee_button_label: v })}
            maxLength={60}
          />
          <Button variant="outline" onClick={onSaveStore} disabled={savingStore}>
            {savingStore ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            Salvar loja oficial
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
