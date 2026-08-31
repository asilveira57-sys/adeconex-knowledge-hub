/**
 * Consentimento de cookies (LGPD/GDPR).
 * Guarda a escolha do usuário no localStorage e notifica os listeners
 * (o runtime de analytics só instala scripts após consentimento explícito).
 */

export type ConsentChoice = "granted" | "denied";

const STORAGE_KEY = "adeconex.cookie-consent.v1";

type Listener = (choice: ConsentChoice) => void;
const listeners = new Set<Listener>();

export function getStoredConsent(): ConsentChoice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "granted" || raw === "denied" ? raw : null;
  } catch {
    return null;
  }
}

export function setConsent(choice: ConsentChoice) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* storage indisponível — mantém apenas em memória nesta sessão */
  }
  listeners.forEach((fn) => fn(choice));
}

export function onConsentChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
