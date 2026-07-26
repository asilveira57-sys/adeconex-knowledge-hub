import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useSession } from "@/hooks/use-session";
import {
  addToCart,
  getMyCart,
  hydrateAnonymousCart,
  mergeAnonymousCart,
  removeCartItem,
  updateCartItem,
  type CartLine,
  type CartSnapshot,
} from "@/lib/cart.functions";
import {
  addToLocalCart,
  clearLocalCart,
  onLocalCartChange,
  readLocalCart,
  removeLocalItem,
  updateLocalQuantity,
} from "@/lib/cart.local";

const CART_QUERY_KEY = ["cart", "me"] as const;

/** Subscribe to localStorage cart changes with useSyncExternalStore. */
function useLocalCart() {
  const subscribe = useCallback((cb: () => void) => onLocalCartChange(cb), []);
  const get = useCallback(() => {
    const items = readLocalCart();
    // Cache-stable snapshot: only replace when serialized value changes.
    return JSON.stringify(items);
  }, []);
  const raw = useSyncExternalStore(subscribe, get, () => "[]");
  return JSON.parse(raw) as ReturnType<typeof readLocalCart>;
}

export function useCart() {
  const { user, ready } = useSession();
  const qc = useQueryClient();
  const localItems = useLocalCart();

  const fetchCart = useServerFn(getMyCart);
  const hydrateFn = useServerFn(hydrateAnonymousCart);
  const addFn = useServerFn(addToCart);
  const updateFn = useServerFn(updateCartItem);
  const removeFn = useServerFn(removeCartItem);
  const mergeFn = useServerFn(mergeAnonymousCart);

  const serverQuery = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: () => fetchCart(),
    enabled: !!user && ready,
    staleTime: 15_000,
  });

  const anonKey = JSON.stringify(localItems);
  const anonQuery = useQuery({
    queryKey: ["cart", "anon", anonKey],
    queryFn: () => hydrateFn({ data: { items: localItems } }),
    enabled: !user && ready && localItems.length > 0,
    staleTime: 30_000,
  });

  // Merge anonymous cart when the user signs in.
  useEffect(() => {
    if (!user) return;
    const items = readLocalCart();
    if (items.length === 0) return;
    mergeFn({ data: { items } })
      .then(({ merged }) => {
        clearLocalCart();
        qc.invalidateQueries({ queryKey: CART_QUERY_KEY });
        if (merged > 0) toast.success(`${merged} item(s) do carrinho foram vinculados à sua conta`);
      })
      .catch(() => {
        // Keep the anonymous cart so the user can retry
      });
    // Only run once per sign-in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const snapshot: CartSnapshot = user
    ? serverQuery.data ?? emptyCartSnapshot()
    : anonQuery.data ?? buildLocalSnapshot(localItems);

  const add = useMutation({
    mutationFn: async (input: { product_id: string; variant_id: string | null; quantity: number }) => {
      if (user) {
        await addFn({ data: input });
      } else {
        addToLocalCart(input);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success("Adicionado ao carrinho");
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível adicionar ao carrinho"),
  });

  const updateQty = useMutation({
    mutationFn: async (input: { item: CartLine; quantity: number }) => {
      if (user) {
        await updateFn({ data: { item_id: input.item.item_id, quantity: input.quantity } });
      } else {
        updateLocalQuantity(input.item.product_id, input.item.variant_id, input.quantity);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CART_QUERY_KEY }),
    onError: (err: Error) => toast.error(err.message || "Não foi possível atualizar"),
  });

  const remove = useMutation({
    mutationFn: async (item: CartLine) => {
      if (user) {
        await removeFn({ data: { item_id: item.item_id } });
      } else {
        removeLocalItem(item.product_id, item.variant_id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast.success("Item removido");
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível remover"),
  });

  return {
    snapshot,
    loading: user ? serverQuery.isLoading : ready && localItems.length > 0 && anonQuery.isLoading,
    add,
    updateQty,
    remove,
    isAuthenticated: !!user,
  };
}

/**
 * Anonymous snapshot — no price data available client-side without hitting the DB,
 * so line_total is 0 for anonymous carts. Prices materialize after login.
 */
function buildLocalSnapshot(items: ReturnType<typeof readLocalCart>): CartSnapshot {
  const lines: CartLine[] = items.map((i, idx) => ({
    item_id: `local-${idx}-${i.product_id}-${i.variant_id ?? "0"}`,
    product_id: i.product_id,
    variant_id: i.variant_id,
    product_name: "",
    product_slug: "",
    variant_label: null,
    sku: null,
    unit_price: 0,
    quantity: i.quantity,
    line_total: 0,
    image_url: null,
    max_stock: null,
    units_per_pack: 1,
    sells_by_kit: false,
  }));

  return {
    cart_id: null,
    currency: "BRL",
    items: lines,
    subtotal: 0,
    item_count: lines.reduce((s, l) => s + l.quantity, 0),
  };
}
