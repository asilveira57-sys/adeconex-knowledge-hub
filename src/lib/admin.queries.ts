import { queryOptions } from "@tanstack/react-query";
import { getProductPreview } from "@/lib/admin.functions";
import { getProductEditor } from "@/lib/admin.product.functions";

export const productPreviewOptions = (productId: string) =>
  queryOptions({
    queryKey: ["admin", "product-preview", productId],
    queryFn: () => getProductPreview({ data: { productId } }),
    staleTime: 15_000,
  });

export const productEditorOptions = (productId: string) =>
  queryOptions({
    queryKey: ["admin", "product-editor", productId],
    queryFn: () => getProductEditor({ data: { productId } }),
    staleTime: 5_000,
  });
