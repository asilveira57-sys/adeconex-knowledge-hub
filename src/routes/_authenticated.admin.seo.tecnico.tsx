import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Save } from "lucide-react";
import { getSiteSettings, updateSiteSetting } from "@/lib/seo-central.functions";
import { BASE_URL } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/seo/tecnico")({
  head: () => ({ meta: [{ title: "SEO Técnico — Admin" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: SeoTechnicalPage,
});

function SeoTechnicalPage() {
  const queryClient = useQueryClient();
  const update = useServerFn(updateSiteSetting);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site-settings"],
    queryFn: () => getSiteSettings(),
  });
  const [robots, setRobots] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const content = (data?.robots_txt as any)?.content;
    if (typeof content === "string") setRobots(content);
  }, [data]);

  const blocksWholeSite = /user-agent\s*:\s*\*[\s\S]*?disallow\s*:\s*\/\s*$/im.test(robots) && !/^allow\s*:/im.test(robots);

  async function onSave() {
    setSaving(true);
    try {
      await update({ data: { key: "robots_txt", value: { content: robots, managed: true } } });
      await queryClient.invalidateQueries({ queryKey: ["admin", "site-settings"] });
      toast.success("Robots.txt atualizado");
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
        <h1 className="text-2xl font-semibold tracking-tight">SEO técnico</h1>
        <p className="mt-1 text-sm text-muted-foreground">Robots.txt gerenciado pelo sistema e informações do sitemap.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Robots.txt</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Servido dinamicamente em <span className="font-mono">{BASE_URL}/robots.txt</span>. A diretiva Sitemap é adicionada automaticamente se ausente.
          </p>
          <textarea
            className="h-56 w-full rounded-md border bg-background p-3 font-mono text-xs"
            value={robots}
            onChange={(e) => setRobots(e.target.value)}
            spellCheck={false}
          />
          {blocksWholeSite && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
              Atenção: esta configuração parece bloquear o site inteiro (User-agent: * com Disallow: /). O salvamento será recusado pelo servidor.
            </div>
          )}
          <Button size="sm" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            Salvar robots.txt
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm">Sitemap.xml</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Gerado dinamicamente com páginas institucionais, ferramentas e posts do blog. Páginas administrativas, login, conta, checkout e carrinho ficam fora automaticamente.
          </p>
          <div className="flex items-center gap-2 rounded-md border p-3 text-sm">
            <span className="flex-1 truncate font-mono text-xs text-muted-foreground">{BASE_URL}/sitemap.xml</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(`${BASE_URL}/sitemap.xml`);
                toast.success("URL copiada");
              }}
            >
              <Copy className="mr-1 h-3 w-3" /> Copiar URL
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
