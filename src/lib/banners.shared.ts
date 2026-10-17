export type BannerPlacement = "home_hero" | "home_secondary" | "page_top";

export type SiteBanner = {
  id: string;
  placement: BannerPlacement;
  page_path: string | null;
  name: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  image_desktop_url: string;
  image_mobile_url: string | null;
  alt: string;
  link_url: string | null;
  open_new_tab: boolean;
  nofollow: boolean;
  sort_order: number;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

/** Formatos e medidas recomendadas (padrão de mercado em e-commerce). */
export const PLACEMENTS: Record<BannerPlacement, { label: string; help: string; desktop: string; mobile: string; ratio: string }> = {
  home_hero: {
    label: "Super banner (página principal)",
    help: "Imagem grande ao lado do título principal. Com mais de um ativo, eles se alternam a cada 6 segundos.",
    desktop: "1200 × 1500 px (vertical 4:5)",
    mobile: "1080 × 1350 px (opcional)",
    ratio: "aspect-[4/5]",
  },
  home_secondary: {
    label: "Banner médio (rolo de etiqueta)",
    help: "Imagem da seção \"Catálogo técnico\" da página principal.",
    desktop: "1600 × 1200 px (4:3)",
    mobile: "1080 × 810 px (opcional)",
    ratio: "aspect-[4/3]",
  },
  page_top: {
    label: "Tarja no topo de uma página",
    help: "Faixa larga logo abaixo do menu, na página que você escolher (ex.: /catalogo, /ribbon).",
    desktop: "1920 × 320 px (6:1)",
    mobile: "1080 × 360 px (3:1, opcional)",
    ratio: "aspect-[6/1]",
  },
};

export function isBannerLive(b: Pick<SiteBanner, "active" | "starts_at" | "ends_at">, now = new Date()): boolean {
  if (!b.active) return false;
  if (b.starts_at && new Date(b.starts_at) > now) return false;
  if (b.ends_at && new Date(b.ends_at) < now) return false;
  return true;
}

/** Normaliza o caminho da página: "/catalogo/" → "/catalogo". */
export function normalizePath(p: string | null | undefined): string {
  let s = (p ?? "").trim();
  if (!s) return "";
  try { if (/^https?:\/\//.test(s)) s = new URL(s).pathname; } catch { /* ignore */ }
  s = s.split(/[?#]/)[0];
  if (!s.startsWith("/")) s = "/" + s;
  if (s.length > 1) s = s.replace(/\/+$/, "");
  return s;
}

export function isExternalUrl(url: string | null | undefined): boolean {
  return !!url && /^https?:\/\//i.test(url) && !/^https?:\/\/(www\.)?adeconex\.com\.br/i.test(url);
}
