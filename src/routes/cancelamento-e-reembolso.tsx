import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/cancelamento-e-reembolso")({
  loader: () => getInstitutionalPage({ data: "cancelamento-e-reembolso" }),
  head: ({ loaderData }) => institutionalHead("cancelamento-e-reembolso", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
