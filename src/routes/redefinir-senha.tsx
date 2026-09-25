import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Adeconex" },
      { name: "description", content: "Crie uma nova senha para sua conta Adeconex." },
      { property: "og:title", content: "Redefinir senha — Adeconex" },
      { property: "og:description", content: "Crie uma nova senha para sua conta Adeconex." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((ev, session) => {
      if (ev === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => data.session && setReady(true));
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast.error("A senha deve ter pelo menos 8 caracteres");
    if (pw !== pw2) return toast.error("As senhas não conferem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso");
    navigate({ to: "/minha-conta" });
  };

  return (
    <div className="container mx-auto flex max-w-md justify-center px-4 py-16">
      <Card className="w-full">
        <CardHeader><CardTitle>Redefinir senha</CardTitle></CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground">Abra esta página pelo link enviado ao seu e-mail.</p>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <Input type="password" placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} />
              <Input type="password" placeholder="Confirme a nova senha" value={pw2} onChange={(e) => setPw2(e.target.value)} />
              <Button type="submit" className="w-full" disabled={busy}>Salvar nova senha</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
