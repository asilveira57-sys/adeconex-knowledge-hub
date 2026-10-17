import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/politica-de-cookies")({
  head: () => institutionalHead("politica-de-cookies"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="politica-de-cookies" />;
}
