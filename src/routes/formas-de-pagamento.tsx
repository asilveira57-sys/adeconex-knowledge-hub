import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/formas-de-pagamento")({
  loader: () => getInstitutionalPage({ data: "formas-de-pagamento" }),
  head: ({ loaderData }) => institutionalHead("formas-de-pagamento", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
