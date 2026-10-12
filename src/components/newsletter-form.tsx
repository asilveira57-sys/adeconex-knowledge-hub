import { useState } from "react";
import { subscribeNewsletter } from "@/lib/app-emails.functions";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  return (
    <form
      className="mt-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        try {
          const r = await subscribeNewsletter({ data: { email, source: "rodape" } });
          setState("done");
          setMsg(r.already ? "Este e-mail já está inscrito." : "Inscrição confirmada! Enviamos um e-mail para você.");
          setEmail("");
        } catch (err) {
          setState("error");
          setMsg(err instanceof Error && err.message.length < 120 ? err.message : "Confira o e-mail e tente novamente.");
        }
      }}
    >
      <label htmlFor="newsletter-email" className="text-sm text-muted-foreground">
        Receba novidades e dicas por e-mail
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="min-w-0 flex-1 rounded-md border hairline bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {state === "sending" ? "..." : "Inscrever"}
        </button>
      </div>
      {msg ? <p className={`mt-2 text-xs ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}>{msg}</p> : null}
    </form>
  );
}

export function DownloadEmailForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  return (
    <form
      className="mt-4 flex max-w-md flex-wrap items-center gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setState("sending");
        try {
          const { emailDownloadLink } = await import("@/lib/app-emails.functions");
          await emailDownloadLink({ data: { email, slug } });
          setState("done");
        } catch {
          setState("error");
        }
      }}
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Receber o link por e-mail (opcional)"
        aria-label="Receber o link por e-mail"
        className="min-w-0 flex-1 rounded-md border hairline bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button type="submit" disabled={state === "sending"} className="rounded-md border hairline px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-60">
        {state === "sending" ? "Enviando..." : "Enviar"}
      </button>
      {state === "done" ? <p className="w-full text-xs text-muted-foreground">Pronto! Enviamos o link para o seu e-mail.</p> : null}
      {state === "error" ? <p className="w-full text-xs text-destructive">Não foi possível enviar agora. Tente novamente em instantes.</p> : null}
    </form>
  );
}
