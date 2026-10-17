export type BannerEventRow = { banner_id: string; placement: string; event_type: "impression" | "click"; created_at: string };
export type Totals = { impressions: number; clicks: number; ctr: number };

/** CTR em % com 2 casas; 0 quando não há visualizações. */
export function ctr(impressions: number, clicks: number): number {
  if (!impressions) return 0;
  return Math.round((clicks / impressions) * 10000) / 100;
}

const empty = () => ({ impressions: 0, clicks: 0 });
const fin = (t: { impressions: number; clicks: number }): Totals => ({ ...t, ctr: ctr(t.impressions, t.clicks) });

/** Agrega eventos por formato, por banner e por dia (fuso de São Paulo). */
export function aggregateBannerEvents(rows: BannerEventRow[]) {
  const total = empty();
  const byPlacement = new Map<string, { impressions: number; clicks: number }>();
  const byBanner = new Map<string, { impressions: number; clicks: number; placement: string }>();
  const byDay = new Map<string, { impressions: number; clicks: number }>();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" });
  for (const r of rows) {
    const k = r.event_type === "click" ? "clicks" : "impressions";
    total[k]++;
    const p = byPlacement.get(r.placement) ?? empty(); p[k]++; byPlacement.set(r.placement, p);
    const b = byBanner.get(r.banner_id) ?? { ...empty(), placement: r.placement }; b[k]++; byBanner.set(r.banner_id, b);
    const day = fmt.format(new Date(r.created_at));
    const d = byDay.get(day) ?? empty(); d[k]++; byDay.set(day, d);
  }
  return {
    total: fin(total),
    byPlacement: [...byPlacement].map(([placement, t]) => ({ placement, ...fin(t) })),
    byBanner: [...byBanner].map(([banner_id, t]) => ({ banner_id, placement: t.placement, ...fin(t) })).sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions),
    byDay: [...byDay].sort(([a], [b]) => a.localeCompare(b)).map(([day, t]) => ({ day, ...fin(t) })),
  };
}
