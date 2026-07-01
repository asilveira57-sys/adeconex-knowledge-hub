/**
 * Mapa de redirects 301 do site antigo (www.adeconex.com.br pré-2030) para a
 * nova arquitetura de rotas. Preserva o SEO equity das ~1.050 keywords
 * ranqueadas do domínio.
 *
 * Regras avaliadas em ORDEM (primeira que casar vence).
 *
 * Como funciona:
 *  - `resolveLegacyRedirect(pathname)` retorna { to, status } ou null.
 *  - Chamado no `beforeLoad` do splat catch-all (`src/routes/$.tsx`).
 *  - Todos os redirects são HTTP 301 (permanentes) para transferir equity.
 */

export type LegacyRule =
  | { type: "exact"; from: string; to: string }
  | { type: "prefix"; from: string; to: string }
  | { type: "regex"; from: RegExp; to: string };

export const LEGACY_REDIRECTS: LegacyRule[] = [
  // ── Home aliases ────────────────────────────────────────────────
  { type: "exact", from: "/home", to: "/" },
  { type: "exact", from: "/index.html", to: "/" },
  { type: "exact", from: "/index.php", to: "/" },

  // ── Silo RIBBON ─────────────────────────────────────────────────
  // Top URLs preservadas 1:1 (rotas próprias existem):
  //   /ribbon
  //   /ribbon/ribbon-resina
  // Consolidação dos demais SKUs para a pillar page.
  { type: "prefix", from: "/ribbon/ribbon-cera", to: "/ribbon" },
  { type: "prefix", from: "/ribbon/ribbon-misto", to: "/ribbon" },
  { type: "prefix", from: "/ribbon/", to: "/ribbon" },

  // ── Silo ETIQUETAS ADESIVAS (site antigo) ───────────────────────
  { type: "prefix", from: "/etiquetas-adesivas/vestuario", to: "/etiquetas/preco" },
  { type: "prefix", from: "/etiquetas-adesivas/controle", to: "/etiquetas/preco" },
  { type: "prefix", from: "/etiquetas-adesivas/seguranca", to: "/etiquetas/preco" },
  { type: "prefix", from: "/etiquetas-adesivas/automacao", to: "/etiquetas/preco" },
  { type: "prefix", from: "/etiquetas-adesivas/etiquetas-para-automacao", to: "/etiquetas/preco" },
  { type: "prefix", from: "/etiquetas-adesivas/", to: "/etiquetas/preco" },
  { type: "exact", from: "/etiquetas-adesivas", to: "/etiquetas/preco" },

  // ── Silo ETIQUETAS IMPRESSAS ────────────────────────────────────
  { type: "prefix", from: "/etiquetas-impressas/", to: "/etiquetas/preco" },
  { type: "exact", from: "/etiquetas-impressas", to: "/etiquetas/preco" },

  // ── Silo ETIQUETAS (index e subcategorias sem pillar dedicada) ──
  { type: "exact", from: "/etiquetas", to: "/etiquetas/preco" },

  // ── Silo FITA DE CETIM ──────────────────────────────────────────
  // Top URL preservada 1:1: /fita-de-cetim/impressora-para-cetim
  { type: "prefix", from: "/fita-de-cetim/gabarito", to: "/fita-de-cetim" },
  { type: "prefix", from: "/fita-de-cetim/", to: "/fita-de-cetim" },

  // ── Silo BRINDES ────────────────────────────────────────────────
  // Top URL preservada 1:1: /brindes/agenda-personalizada
  { type: "prefix", from: "/brindes/", to: "/brindes" },

  // ── SKUs soltos do catálogo antigo ──────────────────────────────
  { type: "regex", from: /^\/etiqueta-mercado-livre/i, to: "/etiquetas/preco" },
  { type: "regex", from: /^\/etiqueta-adesiva-/i, to: "/etiquetas/preco" },
  { type: "regex", from: /^\/etiqueta-redonda/i, to: "/etiquetas/preco" },
  { type: "regex", from: /^\/etiqueta-balanca/i, to: "/etiquetas/preco" },
  { type: "regex", from: /^\/etiqueta-laboratorio/i, to: "/etiquetas/preco" },
  { type: "regex", from: /^\/etiquetas?-adesivas?-/i, to: "/etiquetas/preco" },
  { type: "regex", from: /^\/etiqueta-/i, to: "/etiquetas/preco" },

  // ── Brand aliases ───────────────────────────────────────────────
  { type: "regex", from: /^\/adesivex/i, to: "/" },
];

export interface LegacyMatch {
  to: string;
  status: 301;
}

export function resolveLegacyRedirect(pathname: string): LegacyMatch | null {
  // Normaliza: remove trailing slash exceto raiz, força lower-case para match.
  const raw = pathname.length > 1 && pathname.endsWith("/")
    ? pathname.slice(0, -1)
    : pathname;
  const lower = raw.toLowerCase();

  for (const rule of LEGACY_REDIRECTS) {
    if (rule.type === "exact" && lower === rule.from.toLowerCase()) {
      return { to: rule.to, status: 301 };
    }
    if (rule.type === "prefix" && lower.startsWith(rule.from.toLowerCase())) {
      return { to: rule.to, status: 301 };
    }
    if (rule.type === "regex" && rule.from.test(lower)) {
      return { to: rule.to, status: 301 };
    }
  }
  return null;
}
