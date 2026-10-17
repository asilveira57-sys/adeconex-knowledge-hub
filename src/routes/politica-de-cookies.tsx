import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/politica-de-cookies")({
  loader: () => getInstitutionalPage({ data: "politica-de-cookies" }),
  head: ({ loaderData }) => institutionalHead("politica-de-cookies", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
