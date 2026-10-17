import { createFileRoute } from "@tanstack/react-router";
import { InstitutionalPage, institutionalHead } from "@/components/institutional-page";
import { getInstitutionalPage } from "@/lib/institutional-pages.functions";

export const Route = createFileRoute("/quem-somos")({
  loader: () => getInstitutionalPage({ data: "quem-somos" }),
  head: ({ loaderData }) => institutionalHead("quem-somos", loaderData),
  component: Page,
});

function Page() {
  return <InstitutionalPage page={Route.useLoaderData()} />;
}
