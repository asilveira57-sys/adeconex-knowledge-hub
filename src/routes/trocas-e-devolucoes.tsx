import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/trocas-e-devolucoes")({
  loader: () => getInstitutionalPage({ data: "trocas-e-devolucoes" }),
  head: ({ loaderData }) => institutionalHead("trocas-e-devolucoes", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
