import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => institutionalHead("politica-de-privacidade"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="politica-de-privacidade" />;
}
