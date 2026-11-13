/** Query das vitrines por categoria, sem importar o carrossel (embla) — usada no loader da home. */
import { queryOptions } from "@tanstack/react-query";
import { getShowcase } from "@/lib/catalog.functions";

export const showcaseOptions = (categorySlug: string, limit = 9) =>
  queryOptions({
    queryKey: ["showcase", categorySlug, limit],
    queryFn: () => getShowcase({ data: { categorySlug, limit } }),
    staleTime: 5 * 60_000,
  });
