import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", { _user_id: context.userId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

const digits = (s: unknown) => String(s ?? "").replace(/\D/g, "");

export type AdminCustomerRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  customer_type: "pf" | "pj";
  cpf: string | null;
  phone: string | null;
  whatsapp: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  companies: { legal_name: string; cnpj: string }[];
  orders_count: number;
  paid_total: number;
  last_order_at: string | null;
  missing: string[];
};

async function loadAll(): Promise<AdminCustomerRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const users: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const [{ data: profiles }, { data: companies }, { data: orders }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, full_name, customer_type, cpf, phone, whatsapp, created_at"),
    supabaseAdmin.from("companies").select("user_id, legal_name, cnpj"),
    supabaseAdmin.from("orders").select("user_id, total, status, paid_at, created_at"),
  ]);
  const profMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const PAID = new Set(["pago", "em_preparacao", "aguardando_arte", "arte_aprovada", "em_producao", "enviado", "entregue"]);

  return users.map((u) => {
    const p: any = profMap.get(u.id) ?? {};
    const comps = (companies ?? []).filter((c: any) => c.user_id === u.id);
    const ords = (orders ?? []).filter((o: any) => o.user_id === u.id);
    const type = (p.customer_type ?? "pf") as "pf" | "pj";
    const missing: string[] = [];
    if (!p.cpf) missing.push("cpf");
    if (type === "pj" && comps.length === 0) missing.push("cnpj");
    if (!p.phone && !p.whatsapp) missing.push("telefone");
    return {
      id: u.id,
      full_name: p.full_name ?? u.user_metadata?.full_name ?? null,
      email: u.email ?? null,
      customer_type: type,
      cpf: p.cpf ?? null,
      phone: p.phone ?? null,
      whatsapp: p.whatsapp ?? null,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      companies: comps.map((c: any) => ({ legal_name: c.legal_name, cnpj: c.cnpj })),
      orders_count: ords.length,
      paid_total: ords.filter((o: any) => PAID.has(o.status)).reduce((s: number, o: any) => s + Number(o.total), 0),
      last_order_at: ords.map((o: any) => o.created_at).sort().pop() ?? null,
      missing,
    };
  });
}

const listInput = z.object({
  search: z.string().optional(),
  type: z.enum(["all", "pf", "pj"]).default("all"),
  missing: z.enum(["all", "cpf", "cnpj", "telefone", "complete"]).default("all"),
  sort: z.enum(["recent", "name", "orders", "total"]).default("recent"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(5000).default(25),
});

function applyFilters(rows: AdminCustomerRow[], f: z.infer<typeof listInput>) {
  let r = rows;
  if (f.type !== "all") r = r.filter((x) => x.customer_type === f.type);
  if (f.missing === "complete") r = r.filter((x) => x.missing.length === 0);
  else if (f.missing !== "all") r = r.filter((x) => x.missing.includes(f.missing));
  if (f.search) {
    const q = f.search.toLowerCase().trim();
    const qd = digits(q);
    r = r.filter(
      (x) =>
        (x.full_name ?? "").toLowerCase().includes(q) ||
        (x.email ?? "").toLowerCase().includes(q) ||
        x.companies.some((c) => c.legal_name.toLowerCase().includes(q) || (qd && digits(c.cnpj).includes(qd))) ||
        (qd.length >= 3 && [x.cpf, x.phone, x.whatsapp].some((v) => digits(v).includes(qd))),
    );
  }
  const sorters: Record<string, (a: AdminCustomerRow, b: AdminCustomerRow) => number> = {
    recent: (a, b) => b.created_at.localeCompare(a.created_at),
    name: (a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? "", "pt-BR"),
    orders: (a, b) => b.orders_count - a.orders_count,
    total: (a, b) => b.paid_total - a.paid_total,
  };
  return [...r].sort(sorters[f.sort]);
}

export const listAdminCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => listInput.parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const all = await loadAll();
    const filtered = applyFilters(all, data);
    const from = (data.page - 1) * data.pageSize;
    return {
      rows: filtered.slice(from, from + data.pageSize),
      total: filtered.length,
      stats: {
        total: all.length,
        pj: all.filter((x) => x.customer_type === "pj").length,
        missingCpf: all.filter((x) => x.missing.includes("cpf")).length,
        missingCnpj: all.filter((x) => x.missing.includes("cnpj")).length,
      },
    };
  });

export const getAdminCustomer = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: u }, { data: profile }, { data: companies }, { data: addresses }, { data: orders }] =
      await Promise.all([
        supabaseAdmin.auth.admin.getUserById(data.id),
        supabaseAdmin.from("profiles").select("*").eq("id", data.id).maybeSingle(),
        supabaseAdmin.from("companies").select("*").eq("user_id", data.id).order("created_at"),
        supabaseAdmin.from("customer_addresses").select("*").eq("user_id", data.id).order("created_at"),
        supabaseAdmin
          .from("orders")
          .select("id, order_number, status, total, created_at, paid_at")
          .eq("user_id", data.id)
          .order("created_at", { ascending: false }),
      ]);
    if (!u?.user) throw new Error("Cliente não encontrado");
    return {
      user: {
        id: u.user.id,
        email: u.user.email ?? null,
        created_at: u.user.created_at,
        last_sign_in_at: u.user.last_sign_in_at ?? null,
        email_confirmed_at: u.user.email_confirmed_at ?? null,
        provider: (u.user.app_metadata as any)?.provider ?? "email",
      },
      profile: profile ?? null,
      companies: companies ?? [],
      addresses: addresses ?? [],
      orders: orders ?? [],
    };
  });

const opt = z.string().trim().max(200).optional().nullable().transform((v) => (v ? v : null));

export const updateAdminCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(120),
        customer_type: z.enum(["pf", "pj"]),
        cpf: opt,
        phone: opt,
        whatsapp: opt,
        birth_date: opt,
        email: z.string().trim().email().optional(),
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cpf = data.cpf ? digits(data.cpf) : null;
    if (cpf && cpf.length !== 11) throw new Error("CPF deve ter 11 dígitos");
    const { error } = await supabaseAdmin.from("profiles").upsert({
      id: data.id,
      full_name: data.full_name,
      customer_type: data.customer_type,
      cpf,
      phone: data.phone,
      whatsapp: data.whatsapp,
      birth_date: data.birth_date,
    });
    if (error) throw new Error(error.message);
    if (data.email) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.id);
      if (u?.user && u.user.email !== data.email) {
        const { error: e } = await supabaseAdmin.auth.admin.updateUserById(data.id, { email: data.email, email_confirm: true });
        if (e) throw new Error(e.message);
      }
    }
    return { ok: true };
  });

export const upsertAdminCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: z.string().uuid().optional(),
        user_id: z.string().uuid(),
        cnpj: z.string().min(14),
        legal_name: z.string().trim().min(2).max(200),
        trade_name: opt,
        state_registration: opt,
        municipal_registration: opt,
        phone: opt,
        email: opt,
      })
      .parse(v),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cnpj = digits(data.cnpj);
    if (cnpj.length !== 14) throw new Error("CNPJ deve ter 14 dígitos");
    const row = { ...data, cnpj };
    const { error } = data.id
      ? await supabaseAdmin.from("companies").update(row).eq("id", data.id).eq("user_id", data.user_id)
      : await supabaseAdmin.from("companies").insert({ ...row, is_default: true });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendCustomerPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: z.string().uuid(), redirectTo: z.string().url() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.id);
    const email = u?.user?.email;
    if (!email) throw new Error("Cliente sem e-mail");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo: data.redirectTo });
    if (error) throw new Error(error.message);
    return { ok: true, email };
  });

export const exportAdminCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => listInput.omit({ page: true, pageSize: true }).parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const rows = applyFilters(await loadAll(), { ...data, page: 1, pageSize: 5000 });
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Nome", "E-mail", "Tipo", "CPF", "Razão social", "CNPJ", "Telefone", "WhatsApp", "Pedidos", "Total pago", "Último pedido", "Cadastro", "Pendências"];
    const lines = rows.map((r) =>
      [
        r.full_name, r.email, r.customer_type.toUpperCase(), r.cpf,
        r.companies.map((c) => c.legal_name).join(" | "),
        r.companies.map((c) => c.cnpj).join(" | "),
        r.phone, r.whatsapp, r.orders_count,
        r.paid_total.toFixed(2).replace(".", ","),
        r.last_order_at ? new Date(r.last_order_at).toLocaleDateString("pt-BR") : "",
        new Date(r.created_at).toLocaleDateString("pt-BR"),
        r.missing.join(", "),
      ].map(esc).join(";"),
    );
    return { csv: "\uFEFF" + [header.join(";"), ...lines].join("\n"), count: rows.length };
  });
