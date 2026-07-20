import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar — Adeconex 2030" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const destination = search.redirect?.startsWith("/") ? search.redirect : "/admin";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setNotice(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: destination as never });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(destination)}` },
        });
        if (error) throw error;
        setNotice("Conta criada. Verifique seu e-mail para confirmar (se aplicável) e faça login.");
        setMode("signin");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally { setLoading(false); }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true); setError(null); setNotice(null);
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("adeconex-auth-redirect", destination);
      }
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(destination)}`,
        extraParams: { prompt: "select_account" },
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: destination as never });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao entrar com Google");
    } finally { setGoogleLoading(false); }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <p className="eyebrow text-xs">Área restrita</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Entrar" : "Criar conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesso ao painel administrativo Adeconex 2030.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {notice && <p className="text-sm text-green-600">{notice}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          <span>ou</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button type="button" variant="outline" className="w-full" disabled={googleLoading} onClick={signInWithGoogle}>
          <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs font-semibold">G</span>
          {googleLoading ? "Conectando..." : "Entrar com Google"}
        </Button>
        <div className="mt-4 text-center text-sm">
          <button
            type="button"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); setNotice(null); }}
          >
            {mode === "signin" ? "Não tem conta? Criar" : "Já tem conta? Entrar"}
          </button>
        </div>
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Voltar ao site</Link>
        </div>
      </div>
    </div>
  );
}
