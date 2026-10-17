import { useEffect, useSyncExternalStore } from "react";
import type { SiteBanner } from "@/lib/banners.shared";

/**
 * Modo prévia do editor de banners: a página real é aberta num iframe com
 * ?banner_preview=1 e recebe, via postMessage (mesma origem), o banner em edição.
 */
export const PREVIEW_MSG = "adx-banner-preview";

let current: SiteBanner | null = null;
const subs = new Set<() => void>();

export function isBannerPreviewMode(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.parent !== window && new URLSearchParams(location.search).has("banner_preview"); } catch { return false; }
}

if (typeof window !== "undefined" && isBannerPreviewMode()) {
  window.addEventListener("message", (e) => {
    if (e.origin !== location.origin || e.data?.type !== PREVIEW_MSG) return;
    current = e.data.banner as SiteBanner;
    subs.forEach((f) => f());
    requestAnimationFrame(() => {
      document.querySelector("[data-banner-slot='" + current?.placement + "']")?.scrollIntoView({ block: "center" });
    });
  });
  window.parent.postMessage({ type: PREVIEW_MSG + "-ready" }, location.origin);
}

function usePreviewBanner(): SiteBanner | null {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => current, () => null);
}

/** Substitui os banners de um formato pelo banner em edição, quando em modo prévia. */
export function useBannersWithPreview(placement: SiteBanner["placement"], banners: SiteBanner[]): SiteBanner[] {
  const p = usePreviewBanner();
  return p && p.placement === placement ? [p] : banners;
}

/** true somente no cliente em modo prévia (seguro para hidratação). */
export function usePreviewModeFlag(set: (v: boolean) => void) {
  useEffect(() => { set(isBannerPreviewMode()); }, [set]);
}
