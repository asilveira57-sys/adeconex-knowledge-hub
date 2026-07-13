import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getMyCart, type CartSnapshot } from "./cart.functions";

/**
 * Checkout snapshot — consolidates everything the multi-step flow needs.
 * The cart summary is always recalculated server-side by getMyCart.
 */

export type CheckoutSnapshot = {
  email: string | null;
  cart: CartSnapshot;
  addresses: Array<{
    id: string;
    label: string | null;
    recipient_name: string;
    recipient_document: string | null;
    zip: string;
    street: string;
    number: string;
    complement: string | null;
    district: string;
    city: string;
    state: string;
    country: string;
    kind: "shipping" | "billing" | "both";
    is_default_shipping: boolean;
    is_default_billing: boolean;
  }>;
  companies: Array<{
    id: string;
    cnpj: string;
    legal_name: string;
    trade_name: string | null;
    is_default: boolean;
  }>;
};

export const getCheckoutSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CheckoutSnapshot> => {
    const [cart, addressesRes, companiesRes, userRes] = await Promise.all([
      // Reuse the same server-side price/stock recalc pipeline as the cart page
      getMyCart(),
      context.supabase
        .from("customer_addresses")
        .select(
          "id, label, recipient_name, recipient_document, zip, street, number, complement, district, city, state, country, kind, is_default_shipping, is_default_billing",
        )
        .eq("user_id", context.userId)
        .order("is_default_shipping", { ascending: false })
        .order("created_at", { ascending: true }),
      context.supabase
        .from("companies")
        .select("id, cnpj, legal_name, trade_name, is_default")
        .eq("user_id", context.userId)
        .order("is_default", { ascending: false }),
      context.supabase.auth.getUser(),
    ]);

    return {
      email: userRes.data.user?.email ?? null,
      cart,
      addresses: (addressesRes.data ?? []) as CheckoutSnapshot["addresses"],
      companies: (companiesRes.data ?? []) as CheckoutSnapshot["companies"],
    };
  });
