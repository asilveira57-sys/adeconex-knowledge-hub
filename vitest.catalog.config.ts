import { defineConfig } from "vitest/config";

// Isolate query tests from Start's RPC compilation; browser checks cover routing.
export default defineConfig({
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
  test: { environment: "node", include: ["src/lib/catalog-filters.test.ts"] },
});