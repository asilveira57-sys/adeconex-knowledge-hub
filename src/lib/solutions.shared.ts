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
  specs: Specs;
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

// ---------- Parte 2: dados técnicos e compatibilidade ----------

export type Specs = {
  tech?: "tt" | "dt" | "both" | null; // impressora: transferência térmica, térmica direta ou ambas
  max_width_mm?: number | null; // impressora: largura máxima de impressão
  width_mm?: number | null; // etiqueta / ribbon: largura
  material?: "couche" | "bopp" | "poliester" | "termico" | null; // etiqueta
  ribbon_type?: "cera" | "misto" | "resina" | null; // ribbon
};

export const TECH_LABEL = { tt: "Transferência térmica", dt: "Térmica direta", both: "Térmica direta e transferência" } as const;
export const MATERIAL_LABEL = { couche: "Papel couchê", bopp: "BOPP", poliester: "Poliéster", termico: "Papel térmico" } as const;
export const RIBBON_LABEL = { cera: "Cera", misto: "Misto (cera/resina)", resina: "Resina" } as const;

export type CompatItem = { name: string; category: string; specs: Specs };
export type CompatNote = { level: "error" | "warning" | "info"; message: string };

const num = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);

/** Confere a combinação de itens escolhidos. Só avisa com base nos dados cadastrados; nunca inventa. */
export function checkCompatibility(items: CompatItem[]): { notes: CompatNote[]; missing: string[] } {
  const notes: CompatNote[] = [];
  const missing: string[] = [];
  const printers = items.filter((i) => i.category === "impressora");
  const labels = items.filter((i) => i.category === "etiqueta");
  const ribbons = items.filter((i) => i.category === "ribbon");

  for (const p of printers) {
    if (!num(p.specs.max_width_mm)) missing.push(`largura máxima de impressão de "${p.name}"`);
    if (!p.specs.tech) missing.push(`tecnologia de impressão de "${p.name}"`);
  }
  for (const l of labels) {
    if (!num(l.specs.width_mm)) missing.push(`largura da etiqueta "${l.name}"`);
    if (!l.specs.material) missing.push(`material da etiqueta "${l.name}"`);
  }
  for (const r of ribbons) {
    if (!num(r.specs.width_mm)) missing.push(`largura do ribbon "${r.name}"`);
    if (!r.specs.ribbon_type) missing.push(`tipo do ribbon "${r.name}"`);
  }

  for (const p of printers) {
    const max = num(p.specs.max_width_mm);
    for (const l of labels) {
      const w = num(l.specs.width_mm);
      if (max && w && w > max) notes.push({ level: "error", message: `A etiqueta "${l.name}" (${w} mm) é mais larga que a área de impressão de "${p.name}" (${max} mm).` });
    }
    for (const r of ribbons) {
      const w = num(r.specs.width_mm);
      if (max && w && w > max) notes.push({ level: "error", message: `O ribbon "${r.name}" (${w} mm) é mais largo que "${p.name}" aceita (${max} mm).` });
    }
    if (p.specs.tech === "dt" && ribbons.length) notes.push({ level: "warning", message: `"${p.name}" imprime só em térmica direta e não usa ribbon.` });
    if (p.specs.tech === "dt") for (const l of labels) if (l.specs.material && l.specs.material !== "termico")
      notes.push({ level: "error", message: `"${p.name}" é térmica direta e precisa de etiqueta de papel térmico; "${l.name}" é ${MATERIAL_LABEL[l.specs.material]}.` });
    if ((p.specs.tech === "tt" || p.specs.tech === "both") && !ribbons.length && labels.some((l) => l.specs.material && l.specs.material !== "termico"))
      notes.push({ level: "warning", message: `As etiquetas escolhidas precisam de ribbon para imprimir em "${p.name}", mas nenhum ribbon está na lista.` });
  }

  for (const l of labels) {
    const lw = num(l.specs.width_mm);
    if (l.specs.material === "termico" && ribbons.length) notes.push({ level: "info", message: `"${l.name}" é papel térmico e dispensa ribbon.` });
    for (const r of ribbons) {
      const rw = num(r.specs.width_mm);
      if (lw && rw && rw < lw) notes.push({ level: "warning", message: `O ribbon "${r.name}" (${rw} mm) é mais estreito que a etiqueta "${l.name}" (${lw} mm); parte da etiqueta não será impressa.` });
      const m = l.specs.material, t = r.specs.ribbon_type;
      if (m === "poliester" && t === "cera") notes.push({ level: "error", message: `Ribbon de cera não fixa bem em poliéster. Para "${l.name}", use ribbon de resina.` });
      if (m === "poliester" && t === "misto") notes.push({ level: "warning", message: `Para poliéster ("${l.name}"), o ribbon de resina dá mais resistência que o misto.` });
      if (m === "bopp" && t === "cera") notes.push({ level: "warning", message: `Em BOPP ("${l.name}"), o ribbon misto ou de resina resiste melhor que o de cera.` });
    }
  }
  return { notes, missing };
}

/** Linhas da comparação lado a lado. */
export function compareRows(items: { specs: Specs; category: string }[]) {
  const rows: { label: string; values: string[] }[] = [];
  const add = (label: string, f: (s: Specs) => string | null) => {
    const values = items.map((i) => f(i.specs) ?? "—");
    if (values.some((v) => v !== "—")) rows.push({ label, values });
  };
  add("Tecnologia", (s) => (s.tech ? TECH_LABEL[s.tech] : null));
  add("Largura máxima de impressão", (s) => (num(s.max_width_mm) ? `${s.max_width_mm} mm` : null));
  add("Largura", (s) => (num(s.width_mm) ? `${s.width_mm} mm` : null));
  add("Material", (s) => (s.material ? MATERIAL_LABEL[s.material] : null));
  add("Tipo de ribbon", (s) => (s.ribbon_type ? RIBBON_LABEL[s.ribbon_type] : null));
  return rows;
}
