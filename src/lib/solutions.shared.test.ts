import { describe, it, expect } from "vitest";
import { visibleSteps, validateJourney, externalHref, externalRel, safeTotal, type JourneyDraft } from "./solutions.shared";

const base: JourneyDraft = {
  id: "j", category_id: "c", admin_name: "a", title: "T", slug: "fita-de-cetim", h1: null, intro: "x",
  cover_url: null, cover_alt: null, presentation: null, closing: null, content_before: null, content_after: null,
  status: "draft", sort_order: 0, seo_title: "s", seo_description: "d", canonical_url: null, indexable: true, faqs: [],
  steps: [{ id: "s1", internal_name: null, title: "Etapa", body: null, step_type: "text", image_url: null, image_alt: null,
    sort_order: 0, is_required: false, guidance: null, options: [], condition: null, recommendations: [] }],
};

describe("assistente de soluções", () => {
  it("só mostra a etapa de ribbon quando a resposta pede ribbon", () => {
    const steps = [{ id: "a", condition: null }, { id: "b", condition: { step_id: "a", values: ["ribbon"] } }];
    expect(visibleSteps(steps, { a: ["direta"] }).map((s) => s.id)).toEqual(["a"]);
    expect(visibleSteps(steps, { a: ["ribbon"] }).map((s) => s.id)).toEqual(["a", "b"]);
  });
  it("não publica jornada sem etapas", () => {
    expect(validateJourney({ ...base, steps: [] })).toContain("Adicione pelo menos uma etapa.");
  });
  it("não publica afiliado sem link válido", () => {
    const j = structuredClone(base);
    j.steps[0].recommendations.push({ id: "r", product_id: null, item_category: "leitor", role: null, reason: null, is_required: false,
      quantity: null, sort_order: 0, notes: null, is_active: true, show_when: null, ext_name: "Leitor", ext_description: null,
      ext_manufacturer: null, ext_model: null, ext_image_url: null, ext_platform: "Mercado Livre", ext_original_url: null,
      ext_affiliate_url: "", is_affiliate: true, ext_offer_id: null, ext_checked_at: null, ext_link_status: "ok", ext_button_text: null });
    expect(validateJourney(j).some((e) => e.includes("afiliado"))).toBe(true);
  });
  it("mantém o link de afiliado exatamente como cadastrado e marca como patrocinado", () => {
    const u = "https://mercadolivre.com/sec/abc?matt_tool=123&x=1";
    expect(externalHref({ is_affiliate: true, ext_affiliate_url: u, ext_original_url: null })).toBe(u);
    expect(externalRel(true)).toContain("sponsored");
  });
  it("não soma total quando há item externo", () => {
    expect(safeTotal([{ price: 10, external: false }, { price: null, external: true }])).toBeNull();
    expect(safeTotal([{ price: 10, external: false }, { price: 5, external: false }])).toBe(15);
  });
});

import { checkCompatibility } from "./solutions.shared";
describe("checkCompatibility", () => {
  it("acusa etiqueta mais larga que a impressora", () => {
    const r = checkCompatibility([
      { name: "Imp", category: "impressora", specs: { tech: "tt", max_width_mm: 104 } },
      { name: "Et", category: "etiqueta", specs: { width_mm: 110, material: "couche" } },
      { name: "Rb", category: "ribbon", specs: { width_mm: 110, ribbon_type: "cera" } },
    ]);
    expect(r.notes.filter((n) => n.level === "error")).toHaveLength(2);
  });
  it("aceita 109 mm na boca de 109 mm", () => {
    const r = checkCompatibility([
      { name: "Imp", category: "impressora", specs: { tech: "tt", max_width_mm: 109 } },
      { name: "Et", category: "etiqueta", specs: { width_mm: 109, material: "couche" } },
      { name: "Rb", category: "ribbon", specs: { width_mm: 110, ribbon_type: "cera" } },
    ]);
    expect(r.notes.filter((n) => n.level === "error")).toHaveLength(1); // ribbon 110 > 109
    expect(r.missing).toHaveLength(0);
  });
  it("poliéster com ribbon de cera é erro", () => {
    const r = checkCompatibility([
      { name: "Et", category: "etiqueta", specs: { width_mm: 50, material: "poliester" } },
      { name: "Rb", category: "ribbon", specs: { width_mm: 60, ribbon_type: "cera" } },
    ]);
    expect(r.notes.some((n) => n.level === "error")).toBe(true);
  });
  it("lista dados que faltam", () => {
    const r = checkCompatibility([{ name: "Imp", category: "impressora", specs: {} }]);
    expect(r.missing).toHaveLength(2);
  });
});
