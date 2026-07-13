import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  readCheckout,
  writeCheckout,
  onCheckoutChange,
  type CheckoutSelection,
} from "@/lib/checkout.local";

export function useCheckoutSelection() {
  const subscribe = useCallback((cb: () => void) => onCheckoutChange(cb), []);
  const get = useCallback(() => JSON.stringify(readCheckout()), []);
  const raw = useSyncExternalStore(subscribe, get, () =>
    JSON.stringify({
      address_id: null,
      billing_company_id: null,
      shipping_option: null,
      customer_notes: "",
    }),
  );
  const selection = JSON.parse(raw) as CheckoutSelection;
  return {
    selection,
    update: (patch: Partial<CheckoutSelection>) => writeCheckout(patch),
  };
}

/** Hydrate default address on mount if nothing is selected yet. */
export function useAutoSelectAddress(
  addresses: Array<{ id: string; is_default_shipping: boolean }>,
  currentId: string | null,
  update: (patch: Partial<CheckoutSelection>) => void,
) {
  useEffect(() => {
    if (currentId) return;
    if (addresses.length === 0) return;
    const preferred =
      addresses.find((a) => a.is_default_shipping)?.id ?? addresses[0].id;
    update({ address_id: preferred });
  }, [addresses, currentId, update]);
}
