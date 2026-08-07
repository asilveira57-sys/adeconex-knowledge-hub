import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ferramentas/gerador-de-codigo-de-barras")({
  component: () => <Outlet />,
});
