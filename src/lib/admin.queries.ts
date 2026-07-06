import { queryOptions } from "@tanstack/react-query";
import { getProductPreview } from "@/lib/admin.functions";

export const productPreviewOptions = (productId: string) =>
  queryOptions({
    queryKey: ["admin", "product-preview", productId],
    queryFn: () => getProductPreview({ data: { productId } }),
    staleTime: 15_000,
  });
