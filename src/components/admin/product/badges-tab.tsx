import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setProductBadges } from "@/lib/admin.product.functions";
import { useInvalidateProduct } from "./fields";

type BadgeRow = {
  id: string;
  key: string;
  label: string;
  color: string;
  priority: number;
  auto_rule: string;
  rule_threshold: number | null;
  is_active: boolean;
};

const RULE_LABEL: Record<string, string> = {
  none: "Somente manual",
  best_seller: "Automático: entre os mais vendidos",
  low_stock: "Automático: estoque abaixo do limite",
  new_arrival: "Automático: produto recém-publicado",
  on_sale: "Automático: preço promocional vigente",
  free_shipping: "Automático: elegível a frete grátis",
};

export function BadgesTab({
  productId,
  badges,
  assignments,
}: {
  productId: string;
  badges: BadgeRow[];
  assignments: Array<{ badge_id: string; source: string }>;
}) {
  const save = useServerFn(setProductBadges);
  const invalidate = useInvalidateProduct(productId);
  const [selected, setSelected] = useState<string[]>(
    assignments.filter((a) => a.source === "manual").map((a) => a.badge_id),
  );
  const [saving, setSaving] = useState(false);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function onSave() {
    setSaving(true);
    try {
      await save({ data: { productId, badges: selected.map((badge_id) => ({ badge_id })) } });
      await invalidate();
      toast.success("Selos atualizados");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Selos deste produto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {badges.map((b) => (
            <label key={b.id} className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(b.id)}
                onChange={() => toggle(b.id)}
                className="h-4 w-4"
              />
              <Badge variant={b.color === "destructive" ? "destructive" : b.color === "secondary" ? "secondary" : "default"}>
                {b.label}
              </Badge>
              <span className="flex-1 text-xs text-muted-foreground">
                {RULE_LABEL[b.auto_rule] ?? b.auto_rule}
                {b.rule_threshold != null ? ` (limite: ${b.rule_threshold})` : ""}
              </span>
              {!b.is_active && <span className="text-xs text-destructive">inativo</span>}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            Marcar aqui fixa o selo manualmente neste produto, independentemente da regra automática.
          </p>
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
        Salvar selos
      </Button>
    </div>
  );
}
