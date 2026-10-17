import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/entrega-e-frete")({
  head: () => institutionalHead("entrega-e-frete"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="entrega-e-frete" />;
}
