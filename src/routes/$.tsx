import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { resolveLegacyRedirect } from "@/lib/legacy-redirects";
import { resolveDbRedirect } from "@/lib/redirects.functions";

/**
 * Splat catch-all. Captura QUALQUER URL não resolvida pelas rotas explícitas.
 *
 * Ordem:
 *  1. Redirects cadastrados no admin (public.legacy_redirects) — mais específicos.
 *  2. Regras fixas de `src/lib/legacy-redirects.ts` (prefixos/regex do site antigo).
 *  3. Nada casou → notFound() no loader → HTTP 404 real (não "soft 404").
 */
export const Route = createFileRoute("/$")({
  loader: async ({ location }) => {
    const db = await resolveDbRedirect({ data: { path: location.pathname } }).catch(() => null);
    if (db) throw redirect({ href: db.to, statusCode: db.status });

    const match = resolveLegacyRedirect(location.pathname);
    if (match) throw redirect({ href: match.to, statusCode: match.status });

    throw notFound();
  },
  head: () => ({
    meta: [{ title: "Página não encontrada — Adeconex" }, { name: "robots", content: "noindex" }],
  }),
  // O loader sempre redireciona ou lança notFound(); o componente é só fallback.
  component: () => <LegacyNotFound />,
  notFoundComponent: () => <LegacyNotFound />,
});

function LegacyNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Erro 404</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A URL solicitada não existe na nova Plataforma Adeconex 2030 e não
          consta no mapa de redirects do site antigo. Use o menu para navegar.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Voltar à página inicial
          </a>
          <a
            href="/catalogo"
            className="inline-flex items-center justify-center rounded-md border hairline bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ver catálogo
          </a>
        </div>
      </div>
    </div>
  );
}
