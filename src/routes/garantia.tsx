import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/garantia")({
  head: () => institutionalHead("garantia"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="garantia" />;
}
