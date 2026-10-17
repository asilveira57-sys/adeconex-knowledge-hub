import { describe, expect, it } from "vitest";
import { aggregateBannerEvents, ctr } from "./banner-report.shared";

describe("banner CTR", () => {
  it("is clicks divided by impressions, in percent", () => {
    expect(ctr(200, 5)).toBe(2.5);
  });
  it("is zero when there are no impressions", () => {
    expect(ctr(0, 3)).toBe(0);
  });
});

describe("banner report aggregation", () => {
  const rows = [
    { banner_id: "a", placement: "home_hero", event_type: "impression" as const, created_at: "2026-10-16T15:00:00Z" },
    { banner_id: "a", placement: "home_hero", event_type: "impression" as const, created_at: "2026-10-16T16:00:00Z" },
    { banner_id: "a", placement: "home_hero", event_type: "click" as const, created_at: "2026-10-16T16:01:00Z" },
    { banner_id: "b", placement: "page_top", event_type: "impression" as const, created_at: "2026-10-17T02:00:00Z" },
  ];
  const r = aggregateBannerEvents(rows);
  it("totals per placement", () => {
    expect(r.byPlacement.find((p) => p.placement === "home_hero")).toMatchObject({ impressions: 2, clicks: 1, ctr: 50 });
  });
  it("groups days in São Paulo time", () => {
    // 2026-10-17T02:00Z is still 16/10 in São Paulo
    expect(r.byDay).toHaveLength(1);
    expect(r.byDay[0]).toMatchObject({ day: "2026-10-16", impressions: 3 });
  });
});
