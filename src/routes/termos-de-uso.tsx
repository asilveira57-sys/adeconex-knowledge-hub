import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/termos-de-uso")({
  loader: () => getInstitutionalPage({ data: "termos-de-uso" }),
  head: ({ loaderData }) => institutionalHead("termos-de-uso", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
