import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Megaphone } from "lucide-react";
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
    const t = window.setTimeout(() => setOpen(true), 600);
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
  }

  if (!open || !data) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={data.title || "Aviso"}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="w-full max-w-md rounded-2xl border hairline bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <img src={logoWordmark} alt="Adeconex" className="h-9 w-auto" />
          <button
            type="button"
            onClick={dismiss}
            aria-label="Fechar aviso"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Megaphone className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{data.title}</h2>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{data.message}</p>

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Entendi, continuar navegando
        </button>
      </div>
    </div>
  );
}
