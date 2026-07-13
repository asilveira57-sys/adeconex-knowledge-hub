import { z } from "zod";

// ------- Masks / cleaners -------
export const onlyDigits = (v: string) => (v ?? "").replace(/\D+/g, "");

export const maskCPF = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

export const maskCNPJ = (v: string) => {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

export const maskCEP = (v: string) => {
  const d = onlyDigits(v).slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
};

export const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
};

// ------- CPF / CNPJ digit validation -------
export function isValidCPF(raw: string) {
  const cpf = onlyDigits(raw);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (base: number) => {
    let sum = 0;
    for (let i = 0; i < base; i++) sum += parseInt(cpf[i]) * (base + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === parseInt(cpf[9]) && calc(10) === parseInt(cpf[10]);
}

export function isValidCNPJ(raw: string) {
  const cnpj = onlyDigits(raw);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: number) => {
    const w = base === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let sum = 0;
    for (let i = 0; i < base; i++) sum += parseInt(cnpj[i]) * w[i];
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === parseInt(cnpj[12]) && calc(13) === parseInt(cnpj[13]);
}

// ------- Zod schemas -------
export const profileSchema = z.object({
  full_name: z.string().trim().min(3, "Nome muito curto").max(120),
  customer_type: z.enum(["pf", "pj"]),
  cpf: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
}).superRefine((val, ctx) => {
  if (val.customer_type === "pf") {
    if (!val.cpf || !isValidCPF(val.cpf)) {
      ctx.addIssue({ code: "custom", path: ["cpf"], message: "CPF inválido" });
    }
  }
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const companySchema = z.object({
  id: z.string().uuid().optional(),
  cnpj: z.string().refine((v) => isValidCNPJ(v), "CNPJ inválido"),
  legal_name: z.string().trim().min(2, "Razão social obrigatória").max(200),
  trade_name: z.string().trim().max(200).optional().nullable(),
  state_registration: z.string().trim().max(30).optional().nullable(),
  municipal_registration: z.string().trim().max(30).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email("E-mail inválido").optional().nullable().or(z.literal("")),
  is_default: z.boolean().optional(),
});
export type CompanyInput = z.infer<typeof companySchema>;

export const addressSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional().nullable(),
  label: z.string().trim().max(60).optional().nullable(),
  recipient_name: z.string().trim().min(3, "Nome do destinatário").max(120),
  recipient_document: z.string().trim().max(20).optional().nullable(),
  zip: z.string().refine((v) => onlyDigits(v).length === 8, "CEP inválido"),
  street: z.string().trim().min(2).max(200),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(80).optional().nullable(),
  district: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2, "UF"),
  country: z.string().trim().length(2).default("BR"),
  reference: z.string().trim().max(200).optional().nullable(),
  kind: z.enum(["shipping", "billing", "both"]).default("shipping"),
  is_default_shipping: z.boolean().optional(),
  is_default_billing: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

// ------- ViaCEP -------
export type ViaCepResult = {
  cep: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function fetchViaCep(cep: string): Promise<ViaCepResult | null> {
  const clean = onlyDigits(cep);
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    if (!res.ok) return null;
    const data = (await res.json()) as ViaCepResult;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}
