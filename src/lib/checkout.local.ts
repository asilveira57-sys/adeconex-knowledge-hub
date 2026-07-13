/**
 * Checkout selection state — kept in localStorage so it survives reloads
 * but is never trusted server-side. Server functions re-validate every
 * address_id / company_id / shipping option / quote_id before creating
 * an order.
 */

export type ShippingOptionId = "pickup" | "quote_later" | "carrier";

export type ShippingSnapshot = {
  quote_id: string | null;
  carrier: string;
  service_name: string;
  price: number;
  deadline_days: number;
};

export type CheckoutSelection = {
  address_id: string | null;
  billing_company_id: string | null;
  shipping_option: ShippingOptionId | null;
  shipping_snapshot: ShippingSnapshot | null;
  customer_notes: string;
};

const KEY = "adeconex.checkout.v1";

const empty: CheckoutSelection = {
  address_id: null,
  billing_company_id: null,
  shipping_option: null,
  shipping_snapshot: null,
  customer_notes: "",
};

export function readCheckout(): CheckoutSelection {
  if (typeof window === "undefined") return { ...empty };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...empty };
    return { ...empty, ...(JSON.parse(raw) as Partial<CheckoutSelection>) };
  } catch {
    return { ...empty };
  }
}

export function writeCheckout(patch: Partial<CheckoutSelection>) {
  if (typeof window === "undefined") return;
  const next = { ...readCheckout(), ...patch };
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("adeconex:checkout"));
}

export function clearCheckout() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("adeconex:checkout"));
}

export function onCheckoutChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("adeconex:checkout", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("adeconex:checkout", cb);
    window.removeEventListener("storage", cb);
  };
}

/** Manual fallback modes offered alongside the real carrier quotes. */
export const FALLBACK_SHIPPING = [
  {
    id: "pickup" as const,
    label: "Retirar em Vila Velha (ES)",
    description: "Retirada no CD da Adeconex após a confirmação do pagamento.",
    deadline: "Pronto em até 1 dia útil",
  },
  {
    id: "quote_later" as const,
    label: "Frete a combinar com o comercial",
    description:
      "Nossa equipe confirma o valor e a transportadora após a análise do pedido.",
    deadline: "Prazo confirmado pelo comercial",
  },
];
