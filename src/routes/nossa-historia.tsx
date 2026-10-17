import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/nossa-historia")({
  loader: () => getInstitutionalPage({ data: "nossa-historia" }),
  head: ({ loaderData }) => institutionalHead("nossa-historia", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
