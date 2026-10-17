import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/termos-de-uso")({
  head: () => institutionalHead("termos-de-uso"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="termos-de-uso" />;
}
