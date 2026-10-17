import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queries: [] as Array<{ table: string; eq: Array<[string, unknown]>; range: number[] }> }));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: () => ({ handler: (handler: unknown) => handler }),
    handler: (handler: unknown) => handler,
  }),
}));

function query(table: string) {
  const record = { table, eq: [] as Array<[string, unknown]>, range: [] as number[] };
  mocks.queries.push(record);
  const result = { data: [] as unknown[], error: null, count: 0 };
  const builder = {
    select: () => builder,
    eq: (key: string, value: unknown) => { record.eq.push([key, value]); return builder; },
    in: () => builder,
    order: () => builder,
    range: (from: number, to: number) => { record.range = [from, to]; return builder; },
    maybeSingle: async () => ({ data: record.eq.some(([, value]) => value === "unknown") ? null : { id: `${table}-id` }, error: null }),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

vi.mock("@/lib/catalog-public.server", () => ({ createCatalogPublicClient: () => ({ from: query }) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: query } }));

import { listCatalog } from "./catalog.functions";

// The server-function adapter is replaced with its handler for isolated query tests.
const run = listCatalog as unknown as (input: { data: Record<string, unknown> }) => Promise<{ total: number }>;
const defaults = { page: 1, pageSize: 12, availability: "all", sort: "relevance" };

describe("catalog taxonomy filters", () => {
  beforeEach(() => { mocks.queries.length = 0; });

  it("applies brand to products before pagination", async () => {
    await run({ data: { ...defaults, brandSlug: "inkanto", page: 2 } });
    const products = mocks.queries.find((q) => q.table === "products");
    expect(products?.eq).toContainEqual(["brand_id", "brands-id"]);
    expect(products?.range).toEqual([12, 23]);
  });

  it("combines brand and application as separate AND predicates", async () => {
    await run({ data: { ...defaults, brandSlug: "adeconex", applicationSlug: "logistica" } });
    const products = mocks.queries.find((q) => q.table === "products");
    expect(products?.eq).toContainEqual(["brand_id", "brands-id"]);
    expect(products?.eq).toContainEqual(["application_id", "applications-id"]);
  });

  it("does not ignore an unknown taxonomy slug", async () => {
    expect(await run({ data: { ...defaults, applicationSlug: "unknown" } })).toMatchObject({ total: 0 });
    expect(mocks.queries.some((q) => q.table === "products")).toBe(false);
  });

  it("no longer resolves products by the free shipping badge", async () => {
    await run({ data: { ...defaults, freeShipping: true } });
    const askedForFreeShipping = mocks.queries.some(
      (q) => q.table === "product_badges" && q.eq.some(([key, value]) => key === "key" && value === "free_shipping"),
    );
    expect(askedForFreeShipping).toBe(false);
  });
});