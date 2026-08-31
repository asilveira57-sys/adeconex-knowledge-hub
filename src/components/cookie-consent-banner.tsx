import { useEffect, useState } from "react";
import { Cookie } from "lucide-react";
import { getStoredConsent, setConsent } from "@/lib/consent";

/**
 * Banner de consentimento de cookies (LGPD).
 * Enquanto não houver escolha, nenhum script de analytics é carregado.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const choose = (granted: boolean) => {
    setConsent(granted ? "granted" : "denied");
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4"
    >
      <div className="container-page">
        <div className="flex flex-col gap-4 rounded-lg border hairline bg-card p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
            <p className="text-sm text-muted-foreground">
              Usamos cookies de análise para entender como o site é utilizado e melhorar sua
              experiência. Eles só são ativados com a sua autorização.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => choose(false)}
              className="inline-flex items-center justify-center rounded-md border hairline px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Recusar
            </button>
            <button
              type="button"
              onClick={() => choose(true)}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Aceitar cookies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
