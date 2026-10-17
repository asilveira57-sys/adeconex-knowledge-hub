// Envia eventos anônimos do assistente "Comece por aqui". Nunca quebra a página.
function sessionId() {
  try {
    let id = sessionStorage.getItem("sol_sid");
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem("sol_sid", id); }
    return id;
  } catch { return "anon-session"; }
}

export function trackSolution(journey_slug: string, event_type: string, extra: { step_id?: string; rec_id?: string } = {}) {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify({
      journey_slug, event_type, ...extra, session_id: sessionId(),
      device: window.matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/public/solution-event", new Blob([body], { type: "application/json" }));
    else void fetch("/api/public/solution-event", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } });
  } catch { /* ignore */ }
}
