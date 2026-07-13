/**
 * Anonymous cart persisted in localStorage.
 * Merged into the server cart the moment the user signs in.
 */
export type LocalCartItem = {
  product_id: string;
  variant_id: string | null;
  quantity: number;
};

const KEY = "adeconex.cart.v1";
const EVENT = "adeconex:cart-changed";

export function readLocalCart(): LocalCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r) => ({
        product_id: String(r.product_id ?? ""),
        variant_id: r.variant_id ? String(r.variant_id) : null,
        quantity: Math.max(1, Number(r.quantity) || 1),
      }))
      .filter((r) => r.product_id);
  } catch {
    return [];
  }
}

export function writeLocalCart(items: LocalCartItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearLocalCart(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function addToLocalCart(item: LocalCartItem): void {
  const items = readLocalCart();
  const key = (i: LocalCartItem) => `${i.product_id}|${i.variant_id ?? ""}`;
  const idx = items.findIndex((i) => key(i) === key(item));
  if (idx >= 0) items[idx].quantity += item.quantity;
  else items.push(item);
  writeLocalCart(items);
}

export function updateLocalQuantity(
  product_id: string,
  variant_id: string | null,
  quantity: number,
): void {
  const items = readLocalCart();
  const idx = items.findIndex(
    (i) => i.product_id === product_id && (i.variant_id ?? null) === variant_id,
  );
  if (idx < 0) return;
  if (quantity <= 0) items.splice(idx, 1);
  else items[idx].quantity = quantity;
  writeLocalCart(items);
}

export function removeLocalItem(product_id: string, variant_id: string | null): void {
  const items = readLocalCart().filter(
    (i) => !(i.product_id === product_id && (i.variant_id ?? null) === variant_id),
  );
  writeLocalCart(items);
}

export function onLocalCartChange(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
