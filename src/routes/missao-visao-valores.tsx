import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/missao-visao-valores")({
  head: () => institutionalHead("missao-visao-valores"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="missao-visao-valores" />;
}
