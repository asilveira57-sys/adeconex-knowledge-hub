import { describe, expect, it } from "vitest";
import { isBannerLive, normalizePath } from "./banners.shared";

const now = new Date("2026-10-17T12:00:00Z");

describe("banner schedule", () => {
  it("hides inactive banners", () => {
    expect(isBannerLive({ active: false, starts_at: null, ends_at: null }, now)).toBe(false);
  });
  it("hides banners before their start date", () => {
    expect(isBannerLive({ active: true, starts_at: "2026-10-18T00:00:00Z", ends_at: null }, now)).toBe(false);
  });
  it("hides banners after their end date", () => {
    expect(isBannerLive({ active: true, starts_at: null, ends_at: "2026-10-16T00:00:00Z" }, now)).toBe(false);
  });
  it("shows active banners inside the period", () => {
    expect(isBannerLive({ active: true, starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-10-31T00:00:00Z" }, now)).toBe(true);
  });
});

describe("page path", () => {
  it("matches the page regardless of trailing slash or full URL", () => {
    expect(normalizePath("catalogo/")).toBe("/catalogo");
    expect(normalizePath("https://adeconex.com.br/ribbon?x=1")).toBe("/ribbon");
  });
});
