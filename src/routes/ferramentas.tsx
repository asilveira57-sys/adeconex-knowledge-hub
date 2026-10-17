import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { ProductShowcaseGrid } from "@/components/product-showcase-grid";

export const Route = createFileRoute("/ferramentas")({
  component: ToolsLayout,
});

// Toda ferramenta termina com uma vitrine de produtos (CTA).
function ToolsLayout() {
  const { pathname } = useLocation();
  const kind = pathname.includes("ribbon") ? "ribbon" : "labels";
  return (
    <>
      <Outlet />
      <ProductShowcaseGrid kind={kind} />
    </>
  );
}
