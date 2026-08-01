import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Sparkles, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "./rich-text-editor";
import { Field, TextAreaField, nullable, str, useInvalidateProduct } from "./fields";
import {
  updateProductContent,
  upsertProductFaq,
  deleteProductFaq,
} from "@/lib/admin.product.functions";
import { enrichProduct } from "@/lib/enrichment.functions";

type Faq = { id: string; question: string; answer: string; position: number | null; is_reviewed: boolean | null };

export function ContentTab({ product, faqs }: { product: any; faqs: Faq[] }) {
  const save = useServerFn(updateProductContent);
  const enrich = useServerFn(enrichProduct);
  const invalidate = useInvalidateProduct(product.id);
  const [saving, setSaving] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [commercial, setCommercial] = useState(str(product.commercial_description));
  const [technical, setTechnical] = useState(str(product.technical_description));
  const [included, setIncluded] = useState(str(product.included_items));
  const [warranty, setWarranty] = useState(str(product.warranty));

  async function onSave() {
    setSaving(true);
    try {
      await save({
        data: {
          productId: product.id,
          commercial_description: nullable(commercial),
          technical_description: nullable(technical),
          included_items: nullable(included),
          warranty: nullable(warranty),
        },
      });
      await invalidate();
      toast.success("Conteúdo salvo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onEnrich() {
    setEnriching(true);
    try {
      await enrich({ data: { productId: product.id } });
      await invalidate();
      toast.success("Conteúdo reprocessado pela IA. Recarregue a aba para ver o resultado.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnriching(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-sm">Descrição comercial</CardTitle>
          <Button size="sm" variant="outline" onClick={onEnrich} disabled={enriching}>
            {enriching ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
            Reprocessar com IA
          </Button>
        </CardHeader>
        <CardContent>
          <RichTextEditor value={commercial} onChange={setCommercial} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Descrição técnica</CardTitle>
        </CardHeader>
        <CardContent>
          <RichTextEditor value={technical} onChange={setTechnical} minHeight={320} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Complementos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <TextAreaField label="Itens inclusos" value={included} onChange={setIncluded} rows={3} />
          <TextAreaField label="Garantia" value={warranty} onChange={setWarranty} rows={3} />
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar conteúdo
      </Button>

      <FaqEditor productId={product.id} faqs={faqs} />
    </div>
  );
}

function FaqEditor({ productId, faqs }: { productId: string; faqs: Faq[] }) {
  const upsert = useServerFn(upsertProductFaq);
  const remove = useServerFn(deleteProductFaq);
  const invalidate = useInvalidateProduct(productId);
  const [rows, setRows] = useState(
    faqs.map((f) => ({
      id: f.id as string | undefined,
      question: f.question,
      answer: f.answer,
      position: String(f.position ?? 0),
    })),
  );
  const [busy, setBusy] = useState<string | null>(null);

  function update(idx: number, patch: Partial<(typeof rows)[number]>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function saveRow(idx: number) {
    const r = rows[idx];
    if (r.question.trim().length < 3 || r.answer.trim().length < 3) {
      return toast.error("Pergunta e resposta são obrigatórias");
    }
    setBusy(r.id ?? `new-${idx}`);
    try {
      const res = await upsert({
        data: {
          id: r.id,
          productId,
          question: r.question.trim(),
          answer: r.answer.trim(),
          position: Number(r.position) || 0,
          is_reviewed: true,
        },
      });
      if (!r.id) update(idx, { id: res.id });
      await invalidate();
      toast.success("Pergunta salva");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function removeRow(idx: number) {
    const r = rows[idx];
    if (!r.id) return setRows((rs) => rs.filter((_, i) => i !== idx));
    if (!confirm("Remover esta pergunta?")) return;
    setBusy(r.id);
    try {
      await remove({ data: { id: r.id } });
      setRows((rs) => rs.filter((_, i) => i !== idx));
      await invalidate();
      toast.success("Pergunta removida");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Perguntas frequentes (FAQ)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma pergunta cadastrada.</p>}
        {rows.map((r, idx) => (
          <div key={r.id ?? `new-${idx}`} className="space-y-2 rounded-md border p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_100px]">
              <Field label="Pergunta" value={r.question} onChange={(v) => update(idx, { question: v })} />
              <Field label="Ordem" type="number" value={r.position} onChange={(v) => update(idx, { position: v })} />
            </div>
            <TextAreaField label="Resposta" value={r.answer} onChange={(v) => update(idx, { answer: v })} rows={3} />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => removeRow(idx)} disabled={busy != null}>
                <Trash2 className="mr-1 h-3 w-3" /> Remover
              </Button>
              <Button size="sm" onClick={() => saveRow(idx)} disabled={busy != null}>
                {busy === (r.id ?? `new-${idx}`) && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Salvar
              </Button>
            </div>
          </div>
        ))}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRows((rs) => [...rs, { id: undefined, question: "", answer: "", position: String(rs.length) }])}
        >
          <Plus className="mr-1 h-3 w-3" /> Adicionar pergunta
        </Button>
      </CardContent>
    </Card>
  );
}
