import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { getActiveBanners } from "@/lib/banners.functions";
import { isExternalUrl, normalizePath, type SiteBanner } from "@/lib/banners.shared";
import { trackEvent } from "@/lib/analytics";
import { bannerTrack } from "@/lib/site-tracker";

export const bannersQuery = { queryKey: ["site-banners"], queryFn: () => getActiveBanners(), staleTime: 5 * 60 * 1000 };

function promo(b: SiteBanner, slot: number) {
  return { promotion_id: b.id, promotion_name: b.name || b.alt, creative_name: b.title ?? b.alt, creative_slot: `${b.placement}_${slot + 1}` };
}

/** Imagem do banner com versão mobile, link, alt e eventos de promoção (GA4). */
export function BannerPicture({ banner: b, slot = 0, priority = false, className = "", imgClassName = "", width, height }: {
  banner: SiteBanner; slot?: number; priority?: boolean; className?: string; imgClassName?: string; width: number; height: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting) { trackEvent("view_promotion", promo(b, slot)); bannerTrack("impression", b.id, b.placement); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [b.id, slot]); // eslint-disable-line react-hooks/exhaustive-deps

  const pic = (
    <picture>
      {b.image_mobile_url && <source media="(max-width: 767px)" srcSet={b.image_mobile_url} />}
      <img
        src={b.image_desktop_url}
        alt={b.alt}
        title={b.title ?? undefined}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={imgClassName}
      />
    </picture>
  );
  if (!b.link_url) return <div ref={ref as React.RefObject<HTMLDivElement>} className={className}>{pic}</div>;
  const ext = isExternalUrl(b.link_url);
  const rel = [b.open_new_tab || ext ? "noopener noreferrer" : "", b.nofollow ? "nofollow sponsored" : ""].filter(Boolean).join(" ") || undefined;
  return (
    <a
      ref={ref as React.RefObject<HTMLAnchorElement>}
      href={b.link_url}
      target={b.open_new_tab ? "_blank" : undefined}
      rel={rel}
      aria-label={b.cta_label || b.title || b.alt}
      onClick={() => { trackEvent("select_promotion", promo(b, slot)); bannerTrack("click", b.id, b.placement); }}
      className={className}
    >
      {pic}
    </a>
  );
}

/** Alterna vários banners do mesmo formato (pausa ao passar o mouse). */
export function BannerRotator({ banners, render, interval = 6000 }: {
  banners: SiteBanner[]; render: (b: SiteBanner, i: number) => React.ReactNode; interval?: number;
}) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (banners.length < 2 || paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % banners.length), interval);
    return () => clearInterval(t);
  }, [banners.length, paused, interval]);
  const cur = banners[i % banners.length];
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="relative h-full w-full">
      {render(cur, i % banners.length)}
      {banners.length > 1 && (
        <div className="absolute bottom-3 right-3 z-10 flex gap-1.5">
          {banners.map((b, j) => (
            <button key={b.id} type="button" aria-label={`Mostrar banner ${j + 1}`} aria-current={j === i}
              onClick={() => setI(j)}
              className={`h-2 rounded-full transition-all ${j === i ? "w-6 bg-primary" : "w-2 bg-background/70"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Tarja no topo da página atual, se houver uma cadastrada para este endereço. */
export function PageTopBanner() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useQuery(bannersQuery);
  if (pathname.startsWith("/admin")) return null;
  const path = normalizePath(pathname);
  const list = (data ?? []).filter((b) => b.placement === "page_top" && normalizePath(b.page_path) === path);
  if (!list.length) return null;
  return (
    <div className="container-page pt-4">
      <BannerRotator banners={list} render={(b, i) => (
        <BannerPicture banner={b} slot={i} width={1920} height={320}
          className="block overflow-hidden rounded-lg border hairline"
          imgClassName="aspect-[3/1] w-full object-cover md:aspect-[6/1]" />
      )} />
    </div>
  );
}
