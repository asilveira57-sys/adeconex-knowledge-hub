import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";

export const Route = createFileRoute("/como-comprar")({
  head: () => institutionalHead("como-comprar"),
  component: Page,
});

function Page() {
  return <InstitutionalPage pageKey="como-comprar" />;
}
