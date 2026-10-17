import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Regra do projeto: nunca dizer "sem compra" (telas, e-mails, relatórios).
const BANNED = /sem\s+compras?\b/i;
const ROOTS = ["src", "supabase"];
const EXT = /\.(tsx?|jsx?|html|md|sql|json)$/;

function walk(dir: string, out: string[] = []) {
  let entries: string[] = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXT.test(e) && !p.endsWith("banned-terms.test.ts")) out.push(p);
  }
  return out;
}

describe("termos proibidos", () => {
  it('nenhum arquivo contém "sem compra"', () => {
    const hits = ROOTS.flatMap((r) => walk(r)).flatMap((f) =>
      readFileSync(f, "utf8").split("\n").flatMap((line, i) => (BANNED.test(line) ? [`${f}:${i + 1}`] : [])),
    );
    expect(hits).toEqual([]);
  });
});
