import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/perguntas-frequentes")({
  loader: () => getInstitutionalPage({ data: "perguntas-frequentes" }),
  head: ({ loaderData }) => institutionalHead("perguntas-frequentes", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
