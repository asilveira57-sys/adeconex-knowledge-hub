import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/diferenciais")({
  head: () => institutionalHead("diferenciais"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="diferenciais" />;
}
