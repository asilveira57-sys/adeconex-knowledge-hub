import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/nossa-historia")({
  head: () => institutionalHead("nossa-historia"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="nossa-historia" />;
}
