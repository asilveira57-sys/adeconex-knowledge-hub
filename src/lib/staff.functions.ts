import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const STAFF_SECTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "pedidos", label: "Pedidos" },
  { key: "clientes", label: "Clientes" },
  { key: "artes", label: "Artes" },
  { key: "produtos", label: "Produtos" },
  { key: "cupons", label: "Cupons" },
  { key: "seo", label: "SEO & Tracking" },
  { key: "importacao", label: "Importação" },
  { key: "enriquecimento", label: "Enriquecimento" },
] as const;

export type MyPermissions = {
  isAdmin: boolean;
  isStaff: boolean;
  sections: string[];
  canExportCustomers: boolean;
  canExportOrders: boolean;
  canExportProducts: boolean;
};

type Ctx = { supabase: any; userId: string };

export async function loadPermissions(context: Ctx): Promise<MyPermissions> {
  const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  const list = (roles ?? []).map((r: { role: string }) => r.role);
  const isAdmin = list.includes("admin");
  if (isAdmin) {
    return { isAdmin, isStaff: true, sections: STAFF_SECTIONS.map((s) => s.key), canExportCustomers: true, canExportOrders: true, canExportProducts: true };
  }
  const isEditor = list.includes("editor");
  const { data: p } = await context.supabase.from("staff_permissions").select("*").eq("user_id", context.userId).maybeSingle();
  const active = isEditor && (p?.is_active ?? true);
  return {
    isAdmin: false,
    isStaff: active,
    sections: active ? (p?.sections ?? ["dashboard", "pedidos", "clientes", "artes", "produtos"]) : [],
    canExportCustomers: active && !!p?.can_export_customers,
    canExportOrders: active && !!p?.can_export_orders,
    canExportProducts: active && (p?.can_export_products ?? true),
  };
}

export async function assertPermission(context: Ctx, key: "canExportCustomers" | "canExportOrders" | "canExportProducts") {
  const p = await loadPermissions(context);
  if (!p[key]) throw new Error("Você não tem permissão para exportar estes dados.");
}

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Apenas administradores podem gerenciar colaboradores.");
}

export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => loadPermissions(context));

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role").in("role", ["admin", "editor"]);
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    if (ids.length === 0) return { staff: [] };
    const [{ data: perms }, { data: profiles }, { data: users }] = await Promise.all([
      supabaseAdmin.from("staff_permissions").select("*").in("user_id", ids),
      supabaseAdmin.from("profiles").select("id, full_name").in("id", ids),
      supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const staff = ids.map((id) => {
      const r = (roles ?? []).filter((x) => x.user_id === id).map((x) => x.role as string);
      const p = (perms ?? []).find((x) => x.user_id === id);
      const u = users.users.find((x) => x.id === id);
      const prof = (profiles ?? []).find((x) => x.id === id);
      return {
        user_id: id,
        email: u?.email ?? "",
        name: p?.display_name || prof?.full_name || u?.email || "",
        role: r.includes("admin") ? "admin" : "editor",
        is_active: p?.is_active ?? true,
        sections: p?.sections ?? ["dashboard", "pedidos", "clientes", "artes", "produtos"],
        can_export_customers: p?.can_export_customers ?? false,
        can_export_orders: p?.can_export_orders ?? false,
        can_export_products: p?.can_export_products ?? true,
        last_sign_in_at: u?.last_sign_in_at ?? null,
        is_self: id === context.userId,
      };
    });
    staff.sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === "admin" ? -1 : 1));
    return { staff };
  });

const permsSchema = z.object({
  name: z.string().trim().min(1).max(120),
  role: z.enum(["admin", "editor"]),
  is_active: z.boolean(),
  sections: z.array(z.string()).max(20),
  can_export_customers: z.boolean(),
  can_export_orders: z.boolean(),
  can_export_products: z.boolean(),
});

async function applyStaff(userId: string, d: z.infer<typeof permsSchema>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).in("role", ["admin", "editor"]);
  const { error: rErr } = await supabaseAdmin.from("user_roles").insert({ user_id: userId, role: d.role });
  if (rErr) throw new Error(rErr.message);
  const { error } = await supabaseAdmin.from("staff_permissions").upsert({
    user_id: userId,
    display_name: d.name,
    is_active: d.is_active,
    sections: d.sections,
    can_export_customers: d.can_export_customers,
    can_export_orders: d.can_export_orders,
    can_export_products: d.can_export_products,
  });
  if (error) throw new Error(error.message);
}

export const createStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => permsSchema.extend({ email: z.string().trim().email(), password: z.string().min(8).max(72) }).parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    let user = users.users.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user) {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.name },
      });
      if (error) throw new Error(error.message);
      user = created.user;
    }
    await applyStaff(user.id, data);
    return { ok: true, existed: !!users.users.find((u) => u.id === user!.id) };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => permsSchema.extend({ userId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.userId === context.userId && (data.role !== "admin" || !data.is_active)) {
      throw new Error("Você não pode remover seu próprio acesso de administrador.");
    }
    await applyStaff(data.userId, data);
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ userId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    if (data.userId === context.userId) throw new Error("Você não pode remover a si mesmo.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).in("role", ["admin", "editor"]);
    await supabaseAdmin.from("staff_permissions").delete().eq("user_id", data.userId);
    return { ok: true };
  });

export const setStaffPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ userId: z.string().uuid(), password: z.string().min(8).max(72) }).parse(v))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
