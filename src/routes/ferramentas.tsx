import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { ProductShowcaseGrid } from "@/components/product-showcase-grid";
import { ContentQuestions, loadQuestions } from "@/components/questions/content-questions";
import { normalizeToolPath } from "@/lib/questions.shared";

export const Route = createFileRoute("/ferramentas")({
  loader: async ({ location }) => {
    const path = normalizeToolPath(location.pathname);
    return { path, questions: path ? await loadQuestions({ type: "tool", path }) : null };
  },
  component: ToolsLayout,
});

// Toda ferramenta termina com perguntas e respostas e uma vitrine de produtos (CTA).
function ToolsLayout() {
  const { pathname } = useLocation();
  const loaderData = Route.useLoaderData();
  const kind = pathname.includes("ribbon") ? "ribbon" : "labels";
  const path = normalizeToolPath(pathname);
  return (
    <>
      <Outlet />
      {path ? (
        <ContentQuestions key={path} target={{ type: "tool", path }} title="esta ferramenta"
          initial={loaderData.path === path ? loaderData.questions : undefined} />
      ) : null}
      <ProductShowcaseGrid kind={kind} />
    </>
  );
}
