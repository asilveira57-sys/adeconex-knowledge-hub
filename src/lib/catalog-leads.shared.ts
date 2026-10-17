import { z } from "zod";

/** Dados obrigatórios para salvar/compartilhar uma pesquisa do catálogo. */
export const catalogLeadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(200),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length >= 10 && v.length <= 13, "WhatsApp inválido"),
  consent: z.literal(true, { errorMap: () => ({ message: "É preciso aceitar para continuar" }) }),
  website: z.string().max(0).optional(), // honeypot
  searchParams: z.record(z.union([z.string(), z.number(), z.boolean()])).default({}),
  productIds: z.array(z.string().uuid()).max(60).default([]),
});

export type CatalogLeadInput = z.input<typeof catalogLeadSchema>;

export const LEAD_CHANNELS = ["pdf", "email", "whatsapp"] as const;
export type LeadChannel = (typeof LEAD_CHANNELS)[number];

export function catalogListUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, "")}/catalogo/lista/${token}`;
}

export function whatsappShareUrl(listUrl: string, count: number) {
  const text = `Minha lista do catálogo Adeconex (${count} produtos): ${listUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** Descrição legível dos filtros salvos. */
export function describeSearch(p: Record<string, unknown>): string {
  const labels: Record<string, string> = { cat: "Categoria", marca: "Marca", aplicacao: "Aplicação", badge: "Selo" };
  const sorts: Record<string, string> = { newest: "Mais recentes", price_asc: "Menor preço", price_desc: "Maior preço", name_asc: "Nome A–Z" };
  const parts: string[] = [];
  for (const k of Object.keys(labels)) if (p[k]) parts.push(`${labels[k]}: ${p[k]}`);
  if (p.promo === true) parts.push("Preço promocional");
  if (p.disp === "in_stock") parts.push("Em estoque");
  if (typeof p.sort === "string" && sorts[p.sort]) parts.push(`Ordem: ${sorts[p.sort]}`);
  return parts.length ? parts.join(" · ") : "Todo o catálogo";
}
