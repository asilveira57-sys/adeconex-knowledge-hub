import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/trocas-e-devolucoes")({
  head: () => institutionalHead("trocas-e-devolucoes"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="trocas-e-devolucoes" />;
}
