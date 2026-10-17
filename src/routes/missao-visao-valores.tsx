import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/missao-visao-valores")({
  loader: () => getInstitutionalPage({ data: "missao-visao-valores" }),
  head: ({ loaderData }) => institutionalHead("missao-visao-valores", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
