// Tipos e regras puras do assistente "Comece por aqui" (usadas no site e no painel).

export const STEP_TYPES = [
  { value: "text", label: "Texto explicativo" },
  { value: "single", label: "Seleção de uma opção" },
  { value: "multiple", label: "Seleção de múltiplas opções" },
  { value: "equipment", label: "Recomendação de equipamentos" },
  { value: "supplies", label: "Recomendação de suprimentos" },
  { value: "accessories", label: "Recomendação de acessórios" },
  { value: "compare", label: "Comparação de produtos" },
  { value: "final", label: "Lista final de compras" },
] as const;
export type StepType = (typeof STEP_TYPES)[number]["value"];

export const ITEM_CATEGORIES = [
  { value: "impressora", label: "Impressora" },
  { value: "ribbon", label: "Ribbon" },
  { value: "etiqueta", label: "Etiqueta" },
  { value: "fita-de-cetim", label: "Fita de cetim" },
  { value: "leitor", label: "Leitor de código de barras" },
  { value: "software", label: "Software" },
  { value: "acessorio", label: "Acessório" },
  { value: "consumivel", label: "Consumível" },
  { value: "complementar", label: "Equipamento complementar" },
  { value: "outros", label: "Outros" },
] as const;

export const JOURNEY_STATUS = { draft: "Rascunho", published: "Publicada", inactive: "Inativa" } as const;
export type JourneyStatus = keyof typeof JOURNEY_STATUS;

export const AFFILIATE_NOTICE =
  "Link de afiliado: a Adeconex poderá receber uma comissão pela compra realizada por este link, sem custo adicional para você.";
export const DISCLAIMER =
  "As recomendações são orientativas. Confira sempre as especificações técnicas de cada item antes da compra ou fale com a nossa equipe.";

export type StepOption = { value: string; label: string; description?: string };
/** Mostrar quando a resposta da etapa `step_id` incluir algum dos `values`. */
export type Condition = { step_id: string; values: string[] } | null;
export type Faq = { q: string; a: string };

export type RecDraft = {
  id: string;
  product_id: string | null;
  item_category: string;
  role: string | null;
  reason: string | null;
  is_required: boolean;
  quantity: string | null;
  sort_order: number;
  notes: string | null;
  is_active: boolean;
  show_when: Condition;
  ext_name: string | null;
  ext_description: string | null;
  ext_manufacturer: string | null;
  ext_model: string | null;
  ext_image_url: string | null;
  ext_platform: string | null;
  ext_original_url: string | null;
  ext_affiliate_url: string | null;
  is_affiliate: boolean;
  ext_offer_id: string | null;
  ext_checked_at: string | null;
  ext_link_status: string;
  ext_button_text: string | null;
};

export type StepDraft = {
  id: string;
  internal_name: string | null;
  title: string;
  body: string | null;
  step_type: StepType;
  image_url: string | null;
  image_alt: string | null;
  sort_order: number;
  is_required: boolean;
  guidance: string | null;
  options: StepOption[];
  condition: Condition;
  recommendations: RecDraft[];
};

export type JourneyDraft = {
  id: string;
  category_id: string | null;
  admin_name: string;
  title: string;
  slug: string;
  h1: string | null;
  intro: string | null;
  cover_url: string | null;
  cover_alt: string | null;
  presentation: string | null;
  closing: string | null;
  content_before: string | null;
  content_after: string | null;
  status: JourneyStatus;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  canonical_url: string | null;
  indexable: boolean;
  faqs: Faq[];
  steps: StepDraft[];
};

export type Answers = Record<string, string[]>;

export function slugify(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

export function matches(cond: Condition | undefined, answers: Answers) {
  if (!cond || !cond.step_id || cond.values.length === 0) return true;
  const got = answers[cond.step_id] ?? [];
  return cond.values.some((v) => got.includes(v));
}

/** Etapas visíveis conforme as respostas dadas. */
export function visibleSteps<T extends { condition: Condition }>(steps: T[], answers: Answers) {
  return steps.filter((s) => matches(s.condition, answers));
}

export function isHttpUrl(u: string | null | undefined) {
  if (!u) return false;
  try { const x = new URL(u); return x.protocol === "https:" || x.protocol === "http:"; } catch { return false; }
}

/** Problemas que impedem publicar a jornada. Lista vazia = pode publicar. */
export function validateJourney(j: JourneyDraft, existingProductIds?: Set<string>): string[] {
  const errs: string[] = [];
  if (!j.title.trim()) errs.push("Informe o título público.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(j.slug)) errs.push("O endereço (slug) deve ter só letras minúsculas, números e hífens.");
  if (!j.category_id) errs.push("Escolha a categoria principal.");
  if (!j.intro?.trim()) errs.push("Escreva a descrição introdutória.");
  if (!j.seo_title?.trim() || !j.seo_description?.trim()) errs.push("Preencha o título e a descrição de SEO.");
  if (j.steps.length === 0) errs.push("Adicione pelo menos uma etapa.");
  const ids = new Set(j.steps.map((s) => s.id));
  j.steps.forEach((s, i) => {
    const n = `Etapa ${i + 1}`;
    if (!s.title.trim()) errs.push(`${n}: falta o título.`);
    if ((s.step_type === "single" || s.step_type === "multiple") && s.options.length < 2) errs.push(`${n}: cadastre pelo menos duas opções.`);
    if (s.condition && !ids.has(s.condition.step_id)) errs.push(`${n}: a condição aponta para uma etapa que não existe.`);
    s.recommendations.filter((r) => r.is_active).forEach((r, k) => {
      const rn = `${n}, item ${k + 1}`;
      if (r.product_id) {
        if (existingProductIds && !existingProductIds.has(r.product_id)) errs.push(`${rn}: o produto do catálogo não está mais disponível.`);
      } else {
        if (!r.ext_name?.trim()) errs.push(`${rn}: informe o nome do item externo.`);
        const url = r.is_affiliate ? r.ext_affiliate_url : (r.ext_affiliate_url || r.ext_original_url);
        if (url && !isHttpUrl(url)) errs.push(`${rn}: o link não é válido.`);
        if (r.is_affiliate && !isHttpUrl(r.ext_affiliate_url)) errs.push(`${rn}: link de afiliado ausente ou inválido.`);
      }
    });
  });
  return errs;
}

/** Destino externo exatamente como cadastrado (preserva parâmetros de afiliado). */
export function externalHref(r: Pick<RecDraft, "is_affiliate" | "ext_affiliate_url" | "ext_original_url">) {
  const u = r.is_affiliate ? r.ext_affiliate_url : (r.ext_affiliate_url || r.ext_original_url);
  return isHttpUrl(u) ? u! : null;
}

export function externalRel(isAffiliate: boolean) {
  return isAffiliate ? "sponsored nofollow noopener" : "nofollow noopener";
}

export const GROUPS = [
  { key: "principal", label: "Equipamento principal", types: ["equipment", "compare"] },
  { key: "suprimentos", label: "Suprimentos", types: ["supplies"] },
  { key: "acessorios", label: "Acessórios e software", types: ["accessories"] },
  { key: "outros", label: "Outros itens", types: ["text", "single", "multiple", "final"] },
] as const;

export function groupOfStep(t: StepType) {
  return GROUPS.find((g) => (g.types as readonly string[]).includes(t))?.key ?? "outros";
}

/** Só soma quando todos os itens têm preço confirmado (internos). */
export function safeTotal(items: { price: number | null; external: boolean }[]) {
  if (items.length === 0 || items.some((i) => i.external || i.price == null)) return null;
  return items.reduce((s, i) => s + (i.price ?? 0), 0);
}
