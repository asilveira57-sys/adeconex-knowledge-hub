import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/formas-de-pagamento")({
  head: () => institutionalHead("formas-de-pagamento"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="formas-de-pagamento" />;
}
