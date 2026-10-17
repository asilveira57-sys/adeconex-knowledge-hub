import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/entrega-e-frete")({
  loader: () => getInstitutionalPage({ data: "entrega-e-frete" }),
  head: ({ loaderData }) => institutionalHead("entrega-e-frete", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
