import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { getWhatsappButtonConfig } from "@/lib/seo-central.functions";
import {
  WHATSAPP_BUTTON_DEFAULTS,
  buildWhatsappUrl,
  whatsappVisibleOnPath,
  type WhatsappButtonConfig,
} from "@/lib/seo-central.shared";
import { trackEvent } from "@/lib/analytics";

const POS_KEY = "adeconex:whatsapp-position";
const CLOSED_KEY = "adeconex:whatsapp-closed";
const SIZE = 56;
const MARGIN = 16;
const DRAG_THRESHOLD = 6;

type Pos = { x: number; y: number };

function safeBottomInset(): number {
  if (typeof window === "undefined") return 0;
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;bottom:env(safe-area-inset-bottom,0px);visibility:hidden";
  document.body.appendChild(probe);
  const v = probe.getBoundingClientRect().bottom;
  const inset = Math.max(0, window.innerHeight - v);
  probe.remove();
  return inset;
}

function clamp(p: Pos): Pos {
  const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
  const bottomSafe = MARGIN + safeBottomInset() + (window.innerWidth < 640 ? 56 : 0);
  const maxY = Math.max(MARGIN, window.innerHeight - SIZE - bottomSafe);
  return {
    x: Math.min(Math.max(p.x, MARGIN), maxX),
    y: Math.min(Math.max(p.y, MARGIN), maxY),
  };
}

function defaultPos(side: WhatsappButtonConfig["initial_position"]): Pos {
  const bottomSafe = MARGIN + safeBottomInset() + (window.innerWidth < 640 ? 56 : 0);
  return clamp({
    x: side === "bottom-left" ? MARGIN : window.innerWidth - SIZE - MARGIN,
    y: window.innerHeight - SIZE - bottomSafe,
  });
}

function deviceType(): string {
  if (typeof window === "undefined") return "unknown";
  return window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";
}

/** Evita dois CTAs de WhatsApp concorrendo (widget de atendimento já aberto na página). */
function otherWidgetOpen(): boolean {
  if (typeof document === "undefined") return false;
  return !!document.querySelector(
    '[data-whatsapp-widget-open="true"], .wa-widget-open, iframe[src*="web.whatsapp.com"]',
  );
}

export function WhatsappFloatButton() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data } = useQuery({
    queryKey: ["whatsapp-button-config"],
    queryFn: () => getWhatsappButtonConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const cfg: WhatsappButtonConfig = { ...WHATSAPP_BUTTON_DEFAULTS, ...(data ?? {}) };

  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [closed, setClosed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [conflict, setConflict] = useState(false);
  const moved = useRef(false);
  const start = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      setClosed(window.sessionStorage.getItem(CLOSED_KEY) === "1" || window.localStorage.getItem(CLOSED_KEY) === "1");
    } catch {
      /* storage indisponível */
    }
  }, []);

  // Posição inicial / restaurada
  useEffect(() => {
    if (!mounted) return;
    let saved: Pos | null = null;
    try {
      const raw = window.localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Pos;
        if (typeof p?.x === "number" && typeof p?.y === "number") saved = p;
      }
    } catch {
      /* ignora */
    }
    setPos(clamp(saved ?? defaultPos(cfg.initial_position)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, cfg.initial_position]);

  // Mantém dentro da tela ao redimensionar
  useEffect(() => {
    if (!mounted) return;
    const onResize = () => setPos((p) => (p ? clamp(p) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mounted]);

  // Detecta outro atendimento WhatsApp aberto na página
  useEffect(() => {
    if (!mounted) return;
    const check = () => setConflict(otherWidgetOpen());
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
    return () => obs.disconnect();
  }, [mounted, pathname]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (!cfg.draggable || !pos) return;
      moved.current = false;
      start.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      setDragging(true);
    },
    [cfg.draggable, pos],
  );

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.px;
    const dy = e.clientY - s.py;
    if (!moved.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) moved.current = true;
    if (moved.current) setPos(clamp({ x: s.ox + dx, y: s.oy + dy }));
  }, []);

  const endDrag = useCallback(() => {
    if (!start.current) return;
    start.current = null;
    setDragging(false);
    if (moved.current) {
      setPos((p) => {
        if (p) {
          try {
            window.localStorage.setItem(POS_KEY, JSON.stringify(p));
          } catch {
            /* ignora */
          }
        }
        return p;
      });
    }
  }, []);

  function openWhatsapp() {
    if (moved.current) {
      moved.current = false;
      return;
    }
    trackEvent("whatsapp_click", {
      page_url: window.location.href,
      page_title: document.title,
      device_type: deviceType(),
      button_position: pos ? `${Math.round(pos.x)},${Math.round(pos.y)}` : cfg.initial_position,
    });
    window.open(buildWhatsappUrl(cfg.phone, cfg.message), "_blank", "noopener,noreferrer");
  }

  function close() {
    setClosed(true);
    try {
      window.sessionStorage.setItem(CLOSED_KEY, "1");
      window.localStorage.setItem(CLOSED_KEY, "1");
    } catch {
      /* ignora */
    }
    trackEvent("whatsapp_button_close", {
      page_url: window.location.href,
      page_title: document.title,
      device_type: deviceType(),
      button_position: pos ? `${Math.round(pos.x)},${Math.round(pos.y)}` : cfg.initial_position,
    });
  }

  function restore() {
    setClosed(false);
    try {
      window.sessionStorage.removeItem(CLOSED_KEY);
      window.localStorage.removeItem(CLOSED_KEY);
    } catch {
      /* ignora */
    }
    trackEvent("whatsapp_button_restore", {
      page_url: window.location.href,
      page_title: document.title,
      device_type: deviceType(),
      button_position: pos ? `${Math.round(pos.x)},${Math.round(pos.y)}` : cfg.initial_position,
    });
  }

  if (!mounted || !cfg.enabled || conflict) return null;
  if (!whatsappVisibleOnPath(pathname, cfg)) return null;

  if (closed) {
    return (
      <button
        type="button"
        onClick={restore}
        aria-label="Mostrar botão do WhatsApp"
        className="fixed right-0 top-1/2 z-[80] -translate-y-1/2 rounded-l-md border border-r-0 hairline bg-card/95 px-2 py-3 text-[11px] font-medium tracking-wide text-muted-foreground shadow-card backdrop-blur transition-colors hover:text-foreground"
        style={{ writingMode: "vertical-rl" }}
      >
        WhatsApp
      </button>
    );
  }

  if (!pos) return null;

  return (
    <div
      className="fixed z-[80] animate-in fade-in zoom-in-95 duration-300"
      style={{ left: pos.x, top: pos.y, touchAction: "none" }}
    >
      <div className="relative">
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={openWhatsapp}
          aria-label="Falar no WhatsApp"
          className={`flex h-14 w-14 items-center justify-center rounded-full border hairline bg-[#25D366] text-white shadow-elevated transition-transform duration-200 ${
            dragging ? "scale-105 cursor-grabbing" : "hover:scale-105 cursor-pointer"
          }`}
        >
          <WhatsappIcon className="h-7 w-7" />
        </button>
        {cfg.closable && (
          <button
            type="button"
            onClick={close}
            aria-label="Fechar botão do WhatsApp"
            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border hairline bg-card text-muted-foreground shadow-card transition-colors hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.04 3C9.42 3 4.05 8.37 4.05 14.99c0 2.11.55 4.17 1.6 5.99L3 29l8.2-2.6a12 12 0 0 0 4.84 1.01h.01c6.62 0 11.99-5.37 11.99-11.99C28.04 8.37 22.66 3 16.04 3Zm0 21.99h-.01a9.9 9.9 0 0 1-4.5-1.1l-.32-.18-4.87 1.55 1.58-4.75-.21-.34a9.96 9.96 0 0 1-1.53-5.29c0-5.5 4.48-9.97 9.98-9.97 2.66 0 5.16 1.04 7.04 2.92a9.9 9.9 0 0 1 2.92 7.06c0 5.5-4.48 9.97-9.98 9.97Zm5.47-7.46c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.95 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.51h-.58c-.2 0-.53.07-.8.38-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.23 5.13 4.53.72.31 1.28.5 1.71.63.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}
