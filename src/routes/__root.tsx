import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
// JetBrains Mono used as fallback only; system mono covers it.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { initAnalytics, trackEvent } from "@/lib/analytics";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Erro 404</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          A página que você procura foi movida ou não existe. Use o menu para
          navegar pela plataforma Adeconex.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Voltar à página inicial
          </a>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">Ocorreu um erro</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
          Não foi possível carregar esta página
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tente novamente em instantes ou volte ao início.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

import { BASE_URL } from "@/lib/seo";

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Adeconex",
  url: BASE_URL,
  logo: `${BASE_URL}/favicon.png`,
  description:
    "Plataforma brasileira de autoridade em impressão térmica, etiquetas, ribbons e identificação industrial.",
  sameAs: [
    "https://www.instagram.com/adeconex",
    "https://www.youtube.com/@adeconex",
    "https://www.linkedin.com/company/adeconex",
  ],
};

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#e63946" },
      // Google Search Console — propriedade https://www.adeconex.com.br/
      // Validação será concluída assim que o DNS apontar para esta build.
      {
        name: "google-site-verification",
        content: "IRfNtj5FyxXK1FcjCW7rcOzLrPec09X_F4n5dPSYRzU",
      },
      { title: "Adeconex — Plataforma brasileira de impressão térmica e identificação" },
      {
        name: "description",
        content:
          "Conteúdo técnico, ferramentas gratuitas, produtos e suporte para impressão térmica, etiquetas e ribbons. Compre nos marketplaces oficiais ou solicite orçamento.",
      },
      { property: "og:site_name", content: "Adeconex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Adeconex — Plataforma brasileira de impressão térmica e identificação" },
      { name: "twitter:title", content: "Adeconex — Plataforma brasileira de impressão térmica e identificação" },
      { property: "og:description", content: "Conteúdo técnico, ferramentas gratuitas, produtos e suporte para impressão térmica, etiquetas e ribbons. Compre nos marketplaces oficiais ou solicite orçamento." },
      { name: "twitter:description", content: "Conteúdo técnico, ferramentas gratuitas, produtos e suporte para impressão térmica, etiquetas e ribbons. Compre nos marketplaces oficiais ou solicite orçamento." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1c5edd0f-1eec-472d-92aa-380a9d8b04b2/id-preview-ada3296d--f1254735-6f9e-4e85-8415-5f5c04f66b6c.lovable.app-1785673126472.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/1c5edd0f-1eec-472d-92aa-380a9d8b04b2/id-preview-ada3296d--f1254735-6f9e-4e85-8415-5f5c04f66b6c.lovable.app-1785673126472.png" },
    ],

    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationJsonLd),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackEvent("page_view", { page_path: pathname });
  }, [pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
