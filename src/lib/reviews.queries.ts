/** Query de avaliações para loaders de rota, sem importar o componente de avaliações. */
import { queryOptions } from "@tanstack/react-query";
import { getProductReviews } from "@/lib/reviews.functions";

export type ReviewSort = "recentes" | "uteis" | "maior" | "menor";
export type ReviewFilter = "todas" | "midia" | "verificadas" | "5" | "4" | "3" | "2" | "1";

export const productReviewsOptions = (productId: string, sort: ReviewSort = "recentes", filter: ReviewFilter = "todas", page = 1) =>
  queryOptions({
    queryKey: ["public", "reviews", productId, sort, filter, page],
    queryFn: () => getProductReviews({ data: { productId, sort, filter, page, pageSize: 10 } }),
    staleTime: 60_000,
  });
