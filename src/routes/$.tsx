import { createFileRoute, redirect } from "@tanstack/react-router";
import { resolveLegacyRedirect } from "@/lib/legacy-redirects";

/**
 * Splat catch-all. Captura QUALQUER URL não resolvida pelas rotas explícitas
 * e verifica no mapa de redirects legados (`src/lib/legacy-redirects.ts`).
 *
 * Se casar → HTTP 301 para a rota nova.
 * Se não casar → renderiza NotFound (404 real).
 *
 * Isso preserva o SEO equity das centenas de URLs do site antigo
 * (www.adeconex.com.br pré-2030) que não foram promovidas a pillar pages.
 */
export const Route = createFileRoute("/$")({
  beforeLoad: ({ location }) => {
    const match = resolveLegacyRedirect(location.pathname);
    if (match) {
      throw redirect({ href: match.to, statusCode: match.status });
    }
  },
  component: LegacyNotFound,
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
