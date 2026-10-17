import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/quem-somos")({
  head: () => institutionalHead("quem-somos"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="quem-somos" />;
}
