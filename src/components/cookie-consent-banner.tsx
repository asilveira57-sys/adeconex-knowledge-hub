import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Cookie } from "lucide-react";
import { getStoredConsent, onOpenCookiePreferences, setConsent } from "@/lib/consent";

/**
 * Banner de consentimento de cookies (LGPD).
 * Enquanto não houver escolha, nenhum script de análise/marketing é carregado.
 * Pode ser reaberto pelo link "Preferências de cookies" do rodapé.
 */
export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [analytics, setAnalytics] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === null) setVisible(true);
    return onOpenCookiePreferences(() => {
      setAnalytics(getStoredConsent() === "granted");
      setConfiguring(true);
      setVisible(true);
    });
  }, []);

  if (!visible) return null;

  const choose = (granted: boolean) => {
    setConsent(granted ? "granted" : "denied");
    setVisible(false);
    setConfiguring(false);
  };

  const btn = "inline-flex items-center justify-center rounded-md border hairline px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const primary = "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div role="dialog" aria-label="Preferências de cookies" className="fixed inset-x-0 bottom-0 z-[60] p-3 sm:p-4">
      <div className="container-page">
        <div className="rounded-lg border hairline bg-card p-4 shadow-lg">
          {!configuring ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <Cookie className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Usamos cookies necessários para a loja funcionar e, com a sua autorização, cookies de
                  análise e marketing.{" "}
                  <Link to="/politica-de-cookies" className="underline underline-offset-2 hover:text-foreground">
                    Política de cookies
                  </Link>
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" onClick={() => setConfiguring(true)} className={btn}>Configurar</button>
                <button type="button" onClick={() => choose(false)} className={btn}>Recusar</button>
                <button type="button" onClick={() => choose(true)} className={primary}>Aceitar</button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="font-display text-lg font-semibold">Preferências de cookies</p>
              <div className="flex items-start justify-between gap-4 border-b hairline pb-3">
                <div>
                  <p className="text-sm font-medium">Necessários</p>
                  <p className="text-xs text-muted-foreground">Login, carrinho e sua escolha de cookies. Sempre ativos.</p>
                </div>
                <span className="text-xs text-muted-foreground">Sempre ativos</span>
              </div>
              <label className="flex cursor-pointer items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Análise e marketing</p>
                  <p className="text-xs text-muted-foreground">Google Analytics, Google Tag Manager e Meta Pixel.</p>
                </div>
                <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="mt-1 h-4 w-4 accent-primary" />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" onClick={() => choose(false)} className={btn}>Recusar opcionais</button>
                <button type="button" onClick={() => choose(analytics)} className={primary}>Salvar escolha</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
