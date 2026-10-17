import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/perguntas-frequentes")({
  head: () => institutionalHead("perguntas-frequentes"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="perguntas-frequentes" />;
}
