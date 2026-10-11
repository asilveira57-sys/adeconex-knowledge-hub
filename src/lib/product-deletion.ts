import { z } from "zod";

export const bulkDeleteProductsSchema = z.object({
  productIds: z.array(z.string().uuid()).min(1).max(500).transform((ids) => [...new Set(ids)]),
});

export const deletionResultSchema = z.object({
  deletedIds: z.array(z.string().uuid()),
  failures: z.array(z.object({ id: z.string().uuid(), name: z.string(), reason: z.string() })),
});

export async function deleteProductsWithBlocks(
  client: { rpc: (name: "delete_selected_products", args: { product_ids: string[] }) => PromiseLike<{ data: unknown; error: { message: string } | null }> },
  ids: string[],
) {
  const { productIds } = bulkDeleteProductsSchema.parse({ productIds: ids });
  const { data, error } = await client.rpc("delete_selected_products", { product_ids: productIds });
  if (error) throw new Error(error.message);
  return deletionResultSchema.parse(data);
}