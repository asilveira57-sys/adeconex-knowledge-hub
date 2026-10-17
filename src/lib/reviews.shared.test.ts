import { describe, expect, it } from "vitest";
import { computeRatingStats, dueReviewEmail, isTokenExpired, isValidRating, moderationFlags, reviewTokenExpiry } from "./reviews.shared";

describe("nota", () => {
  it("aceita 0,5 a 5 em passos de 0,5", () => {
    expect([0.5, 1, 2.5, 4.5, 5].every(isValidRating)).toBe(true);
  });
  it("recusa fora da faixa ou passo diferente", () => {
    expect([0, 0.3, 4.7, 5.5, 6, NaN].some(isValidRating)).toBe(false);
  });
});

describe("média e distribuição", () => {
  it("calcula média e faixas", () => {
    const s = computeRatingStats([5, 4.5, 4, 2]);
    expect(s.average).toBe(3.88);
    expect(s.count).toBe(4);
    expect(s.distribution).toEqual({ 1: 0, 2: 1, 3: 0, 4: 2, 5: 1 });
  });
});

describe("agendamento", () => {
  const d = "2026-01-01T12:00:00Z";
  it("primeiro e-mail só 7 dias após entrega", () => {
    expect(dueReviewEmail({ deliveredAt: d, sentAt: null, reminderSentAt: null, completedAt: null }, new Date("2026-01-07T12:00:00Z"))).toBeNull();
    expect(dueReviewEmail({ deliveredAt: d, sentAt: null, reminderSentAt: null, completedAt: null }, new Date("2026-01-08T12:00:00Z"))).toBe("request");
  });
  it("um lembrete 7 dias depois e nada mais", () => {
    const sent = "2026-01-08T12:00:00Z";
    expect(dueReviewEmail({ deliveredAt: d, sentAt: sent, reminderSentAt: null, completedAt: null }, new Date("2026-01-15T12:00:00Z"))).toBe("reminder");
    expect(dueReviewEmail({ deliveredAt: d, sentAt: sent, reminderSentAt: "2026-01-15T12:00:00Z", completedAt: null }, new Date("2026-03-01T00:00:00Z"))).toBeNull();
  });
  it("nada se já avaliou", () => {
    expect(dueReviewEmail({ deliveredAt: d, sentAt: null, reminderSentAt: null, completedAt: d }, new Date("2026-02-01"))).toBeNull();
  });
});

describe("token", () => {
  it("expira em 60 dias", () => {
    const exp = reviewTokenExpiry(new Date("2026-01-01T00:00:00Z")).toISOString();
    expect(isTokenExpired(exp, new Date("2026-03-01T23:59:00Z"))).toBe(false);
    expect(isTokenExpired(exp, new Date("2026-03-02T00:00:00Z"))).toBe(true);
  });
});

describe("moderação", () => {
  it("marca links e telefones", () => {
    expect(moderationFlags("veja www.loja.com ou ligue 27 99999-1234")).toEqual(expect.arrayContaining(["link", "telefone"]));
    expect(moderationFlags("Etiqueta de ótima qualidade, recomendo")).toEqual([]);
  });
});
