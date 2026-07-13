import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  profileSchema,
  companySchema,
  addressSchema,
  onlyDigits,
  type ProfileInput,
  type CompanyInput,
  type AddressInput,
} from "./account.validation";
import { z } from "zod";

/**
 * Account server functions — customer self-service.
 * RLS already scopes everything to auth.uid(); we still explicitly set user_id.
 */

// ---------- READ ----------
export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [profileRes, companiesRes, addressesRes] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
      context.supabase.from("companies").select("*").eq("user_id", context.userId).order("created_at"),
      context.supabase.from("customer_addresses").select("*").eq("user_id", context.userId).order("created_at"),
    ]);

    // Bootstrap profile row if missing (older accounts before trigger)
    let profile = profileRes.data;
    if (!profile) {
      const { data: created } = await context.supabase
        .from("profiles")
        .insert({ id: context.userId, customer_type: "pf" })
        .select("*")
        .single();
      profile = created;
    }

    const { data: authUser } = await context.supabase.auth.getUser();

    return {
      email: authUser.user?.email ?? null,
      profile,
      companies: companiesRes.data ?? [],
      addresses: addressesRes.data ?? [],
    };
  });

// ---------- PROFILE ----------
export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => profileSchema.parse(data) as ProfileInput)
  .handler(async ({ context, data }) => {
    const payload = {
      id: context.userId,
      full_name: data.full_name,
      customer_type: data.customer_type,
      cpf: data.cpf ? onlyDigits(data.cpf) : null,
      phone: data.phone ? onlyDigits(data.phone) : null,
      whatsapp: data.whatsapp ? onlyDigits(data.whatsapp) : null,
      birth_date: data.birth_date || null,
    };
    const { error } = await context.supabase.from("profiles").upsert(payload);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- COMPANIES ----------
export const upsertCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => companySchema.parse(data) as CompanyInput)
  .handler(async ({ context, data }) => {
    const payload = {
      id: data.id,
      user_id: context.userId,
      cnpj: onlyDigits(data.cnpj),
      legal_name: data.legal_name,
      trade_name: data.trade_name || null,
      state_registration: data.state_registration || null,
      municipal_registration: data.municipal_registration || null,
      phone: data.phone ? onlyDigits(data.phone) : null,
      email: data.email || null,
      is_default: !!data.is_default,
    };

    if (payload.is_default) {
      await context.supabase
        .from("companies")
        .update({ is_default: false })
        .eq("user_id", context.userId);
    }

    const { data: row, error } = await context.supabase
      .from("companies")
      .upsert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("companies")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ADDRESSES ----------
export const upsertAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => addressSchema.parse(data) as AddressInput)
  .handler(async ({ context, data }) => {
    const payload = {
      id: data.id,
      user_id: context.userId,
      company_id: data.company_id || null,
      label: data.label || null,
      recipient_name: data.recipient_name,
      recipient_document: data.recipient_document ? onlyDigits(data.recipient_document) : null,
      zip: onlyDigits(data.zip),
      street: data.street,
      number: data.number,
      complement: data.complement || null,
      district: data.district,
      city: data.city,
      state: data.state.toUpperCase(),
      country: (data.country || "BR").toUpperCase(),
      reference: data.reference || null,
      kind: data.kind,
      is_default_shipping: !!data.is_default_shipping,
      is_default_billing: !!data.is_default_billing,
    };

    if (payload.is_default_shipping) {
      await context.supabase
        .from("customer_addresses")
        .update({ is_default_shipping: false })
        .eq("user_id", context.userId);
    }
    if (payload.is_default_billing) {
      await context.supabase
        .from("customer_addresses")
        .update({ is_default_billing: false })
        .eq("user_id", context.userId);
    }

    const { data: row, error } = await context.supabase
      .from("customer_addresses")
      .upsert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("customer_addresses")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
