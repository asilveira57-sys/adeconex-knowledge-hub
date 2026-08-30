import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, AlertTriangle } from "lucide-react";
import { getLaunchNotice } from "@/lib/seo-central.functions";
import logoWordmark from "@/assets/brand/logo-adeconex.png";

const STORAGE_KEY = "adeconex:launch-notice-dismissed";

/** Hash simples da mensagem: ao editar o texto, o pop-up volta a aparecer para todos. */
function versionOf(title: string, message: string): string {
  const s = `${title}::${message}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

export function LaunchNoticePopup() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { data } = useQuery({
    queryKey: ["launch-notice"],
    queryFn: () => getLaunchNotice(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!data?.enabled || !data.message) return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === versionOf(data.title, data.message)) return;
    } catch {
      // storage indisponível — mostra mesmo assim
    }
    const t = window.setTimeout(() => {
      setMounted(true);
      // pequeno delay para garantir a transição de entrada
      window.setTimeout(() => setOpen(true), 30);
    }, 400);
    return () => window.clearTimeout(t);
  }, [data]);

  function dismiss() {
    setOpen(false);
    if (data) {
      try {
        window.localStorage.setItem(STORAGE_KEY, versionOf(data.title, data.message));
      } catch {
        // ignora
      }
    }
    window.setTimeout(() => setMounted(false), 250);
  }

  if (!mounted || !data) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={data.title || "Aviso"}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-opacity duration-250 ${
        open ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "hsl(var(--foreground) / 0.45)" }}
      onClick={dismiss}
    >
      <div
        className={`w-full max-w-md transform overflow-hidden rounded-2xl border hairline bg-background p-6 shadow-2xl transition-all duration-250 ${
          open ? "translate-y-0 scale-100" : "translate-y-4 scale-95"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* topo: logo + fechar */}
        <div className="flex items-start justify-between gap-4">
          <img src={logoWordmark} alt="Adeconex" className="h-9 w-auto" />
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar aviso"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* corpo */}
        <div className="mt-5 flex items-start gap-4">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold leading-snug tracking-tight text-foreground">
              {data.title || "Aviso importante"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {data.message}
            </p>
          </div>
        </div>

        {/* rodapé */}
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Entendi, continuar navegando
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Nenhum pedido realizado neste período terá validade comercial até o lançamento oficial.
          </p>
        </div>
      </div>
    </div>
  );
}
