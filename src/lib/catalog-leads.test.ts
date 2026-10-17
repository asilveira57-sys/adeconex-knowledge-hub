import { describe, expect, it } from "vitest";
import { catalogLeadSchema } from "./catalog-leads.shared";

const base = { name: "Maria Silva", email: "maria@ex.com", phone: "(27) 99273-3033", consent: true as const };

describe("catalog lead", () => {
  it("accepts name, email, WhatsApp and consent", () => {
    expect(catalogLeadSchema.parse(base).phone).toBe("27992733033");
  });
  it("requires WhatsApp", () => {
    expect(catalogLeadSchema.safeParse({ ...base, phone: "" }).success).toBe(false);
  });
  it("requires email", () => {
    expect(catalogLeadSchema.safeParse({ ...base, email: "" }).success).toBe(false);
  });
  it("requires consent", () => {
    expect(catalogLeadSchema.safeParse({ ...base, consent: false }).success).toBe(false);
  });
  it("rejects bots filling the hidden field", () => {
    expect(catalogLeadSchema.safeParse({ ...base, website: "spam" }).success).toBe(false);
  });
});
