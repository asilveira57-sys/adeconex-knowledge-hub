import { describe, expect, it, vi } from "vitest";
import { deleteProductsWithBlocks } from "./product-deletion";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";

describe("exclusão de produtos", () => {
  it("envia todos os selecionados uma única vez para a exclusão protegida", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { deletedIds: [first, second], failures: [] }, error: null });
    const result = await deleteProductsWithBlocks({ rpc }, [first, second, first]);
    expect(rpc).toHaveBeenCalledWith("delete_selected_products", { product_ids: [first, second] });
    expect(result.deletedIds).toEqual([first, second]);
  });

  it("mantém produtos vinculados a pedidos e informa quais não foram excluídos", async () => {
    const failure = { id: second, name: "Produto vendido", reason: "Produto vinculado a pedidos. Use Ocultar ou Descontinuar." };
    const rpc = vi.fn().mockResolvedValue({ data: { deletedIds: [first], failures: [failure] }, error: null });
    const result = await deleteProductsWithBlocks({ rpc }, [first, second]);
    expect(result.deletedIds).not.toContain(second);
    expect(result.failures).toEqual([failure]);
  });
});