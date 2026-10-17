import { useEffect, useState } from "react";
import { Share2, FileDown, Mail, MessageCircle, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "@/hooks/use-session";
import { listCatalog } from "@/lib/catalog.functions";
import { createCatalogLead, getCatalogList, recordCatalogLeadChannel } from "@/lib/catalog-leads.functions";
import { catalogLeadSchema, catalogListUrl, describeSearch, whatsappShareUrl } from "@/lib/catalog-leads.shared";
import { buildCatalogListPdf, downloadBlob } from "@/lib/catalog-list-pdf";
import { trackEvent } from "@/lib/analytics";
import adeconexLogo from "@/assets/brand/logo-adeconex-oficial.png";

type Filters = {
  categorySlug?: string; brandSlug?: string; applicationSlug?: string; badge?: string;
  onSale?: boolean; availability: "all" | "in_stock";
  sort: "relevance" | "newest" | "price_asc" | "price_desc" | "name_asc";
};

export function ShareSearchDialog({ filters, searchParams }: { filters: Filters; searchParams: Record<string, string | number | boolean> }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", consent: false, website: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ token: string; count: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pdf, setPdf] = useState<Blob | null>(null);
  const create = useServerFn(createCatalogLead);
  const record = useServerFn(recordCatalogLeadChannel);
  const getList = useServerFn(getCatalogList);
  const list = useServerFn(listCatalog);

  useEffect(() => {
    const u = session?.user;
    if (!open || !u) return;
    setForm((f) => ({
      ...f,
      email: f.email || u.email || "",
      name: f.name || (u.user_metadata?.full_name as string) || "",
      phone: f.phone || (u.user_metadata?.phone as string) || "",
    }));
  }, [open, session]);

  const listUrl = saved ? catalogListUrl(window.location.origin, saved.token) : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pages = await Promise.all([1, 2].map((page) => list({ data: { ...filters, page, pageSize: 30 } })));
    const productIds = [...new Set(pages.flatMap((p) => p.items.map((i) => i.id)))].slice(0, 60);
    const parsed = catalogLeadSchema.safeParse({ ...form, consent: form.consent || undefined, searchParams, productIds });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0])] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const r = await create({ data: parsed.data });
      setSaved({ token: r.token, count: r.count });
      trackEvent("generate_lead", { lead_source: "catalog_share", items: r.count });
      // Gera o PDF já, para que o clique em "Baixar" funcione inclusive no celular.
      const l = await getList({ data: { token: r.token } });
      if (l) {
        const blob = await buildCatalogListPdf({
          products: l.products, filters: describeSearch(l.searchParams), logoUrl: adeconexLogo,
          listUrl: catalogListUrl(window.location.origin, r.token),
        });
        setPdf(blob);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar sua lista.");
    } finally {
      setSaving(false);
    }
  };

  const channel = async (c: "pdf" | "email" | "whatsapp") => {
    if (!saved) return;
    trackEvent("share_search", { method: c, items: saved.count });
    if (c === "pdf" && pdf) downloadBlob(pdf, "lista-catalogo-adeconex.pdf");
    if (c === "whatsapp") window.open(whatsappShareUrl(listUrl, saved.count), "_blank", "noopener");
    setBusy(c);
    try {
      const r = await record({ data: { token: saved.token, channel: c } });
      if (c === "email") r.ok ? toast.success(`Enviamos a lista para ${form.email}.`) : toast.error("Não conseguimos enviar o e-mail agora. Use o PDF ou o WhatsApp.");
    } catch (err) {
      if (c === "email") toast.error(err instanceof Error ? err.message : "Falha ao enviar.");
    } finally {
      setBusy(null);
    }
  };

  const field = (k: "name" | "email" | "phone", label: string, type = "text", ph = "") => (
    <div className="space-y-1">
      <Label htmlFor={`lead-${k}`}>{label}</Label>
      <Input id={`lead-${k}`} type={type} placeholder={ph} value={form[k]} maxLength={k === "email" ? 200 : 100}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSaved(null); setPdf(null); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4 text-signal" /> Salvar / compartilhar pesquisa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{saved ? "Sua lista está salva" : "Salvar esta pesquisa"}</DialogTitle>
          <DialogDescription>
            {saved
              ? `${saved.count} produtos guardados. Escolha como quer receber.`
              : "Deixe seus dados para receber a lista em PDF, por e-mail ou WhatsApp."}
          </DialogDescription>
        </DialogHeader>
        {!saved ? (
          <form onSubmit={submit} className="space-y-3" noValidate>
            {field("name", "Nome", "text", "Seu nome")}
            {field("email", "E-mail", "email", "voce@empresa.com.br")}
            {field("phone", "WhatsApp", "tel", "(27) 99999-0000")}
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hidden"
              value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={form.consent} onCheckedChange={(v) => setForm({ ...form, consent: v === true })} className="mt-0.5" />
              <span>Aceito receber esta lista e contato da Adeconex.</span>
            </label>
            {errors.consent && <p className="text-xs text-destructive">{errors.consent}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar minha lista"}
            </Button>
          </form>
        ) : (
          <div className="grid gap-2">
            <Button onClick={() => channel("pdf")} disabled={!pdf} className="justify-start gap-2">
              {pdf ? <FileDown className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />} Baixar PDF
            </Button>
            <Button variant="outline" onClick={() => channel("email")} disabled={busy === "email"} className="justify-start gap-2">
              <Mail className="h-4 w-4" /> Receber no e-mail ({form.email})
            </Button>
            <Button variant="outline" onClick={() => channel("whatsapp")} className="justify-start gap-2">
              <MessageCircle className="h-4 w-4" /> Enviar pelo WhatsApp
            </Button>
            <p className="flex items-center gap-1 pt-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3" /> Link da lista: <a href={listUrl} target="_blank" rel="noreferrer" className="underline truncate">{listUrl}</a>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
