import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/cancelamento-e-reembolso")({
  head: () => institutionalHead("cancelamento-e-reembolso"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="cancelamento-e-reembolso" />;
}
