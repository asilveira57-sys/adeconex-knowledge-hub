import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/politica-de-privacidade")({
  loader: () => getInstitutionalPage({ data: "politica-de-privacidade" }),
  head: ({ loaderData }) => institutionalHead("politica-de-privacidade", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
