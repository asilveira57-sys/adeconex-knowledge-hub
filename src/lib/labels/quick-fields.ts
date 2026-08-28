/**
 * "Dados da etiqueta": transforma as camadas do design em campos amigáveis
 * (EAN, nome do produto, preço, CRECI, contato, URL/QR) que o cliente
 * preenche antes de gerar a etiqueta — sem precisar clicar em cada elemento.
 */
import { SYMBOLOGY_BY_ID, validateValue } from "@/lib/barcode/symbologies";
import type { LabelDesign, LabelLayer } from "@/lib/labels/shared";

export interface QuickField {
  /** id da camada */
  id: string;
  label: string;
  hint?: string;
  value: string;
  kind: "text" | "barcode" | "qrcode";
  multiline: boolean;
  maxLength: number;
  placeholder: string;
}

export interface QuickFieldCheck {
  ok: boolean;
  message?: string;
  /** valor sugerido para o botão "corrigir" */
  fix?: string;
  info?: string;
}

const MAX_TEXT = 300;
const MAX_URL = 1200;

function textLabel(text: string, isTitle: boolean): { label: string; placeholder: string; hint?: string } {
  const t = text.trim();
  const lower = t.toLowerCase();

  if (/creci/i.test(t)) return { label: "CRECI", placeholder: "CRECI 00000-F" };
  if (/r\$|pre[cç]o/i.test(t)) return { label: "Preço", placeholder: "R$ 19,90", hint: "Use vírgula para os centavos." };
  if (/@|\(\d{2}\)|\d{4,5}-\d{4}|whats/i.test(t))
    return { label: "Contato", placeholder: "(27) 99999-0000", hint: "Telefone, WhatsApp ou e-mail." };
  if (/validade|^val[:\s]/i.test(lower)) return { label: "Validade", placeholder: "VAL: 00/00/0000" };
  if (/^fab|fabrica/i.test(lower)) return { label: "Fabricação", placeholder: "FAB: 00/00/0000" };
  if (/lote/i.test(lower)) return { label: "Lote", placeholder: "LOTE: 0000" };
  if (/c[óo]d\.?|sku|refer[êe]ncia/i.test(lower)) return { label: "Código interno / SKU", placeholder: "001234" };
  if (/patrim[óo]nio/i.test(lower)) return { label: "Título do ativo", placeholder: "PATRIMÔNIO" };
  if (isTitle) return { label: "Nome do produto / título", placeholder: "NOME DO PRODUTO" };

  const preview = t.replace(/\s+/g, " ").slice(0, 24);
  return { label: preview ? `Texto “${preview}”` : "Texto", placeholder: "Digite o texto" };
}

/** Deriva os campos preenchíveis a partir das camadas do design. */
export function quickFields(design: LabelDesign): QuickField[] {
  const texts = design.layout.filter((l): l is Extract<LabelLayer, { kind: "text" }> => l.kind === "text");
  const titleId = texts.length
    ? texts.reduce((a, b) => (b.fontSize > a.fontSize ? b : a)).id
    : null;

  const fields: QuickField[] = [];
  for (const l of design.layout) {
    if (l.kind === "text") {
      const meta = textLabel(l.text, l.id === titleId);
      fields.push({
        id: l.id,
        label: meta.label,
        hint: meta.hint,
        value: l.text,
        kind: "text",
        multiline: l.text.includes("\n") || l.text.length > 40,
        maxLength: MAX_TEXT,
        placeholder: meta.placeholder,
      });
    } else if (l.kind === "barcode") {
      const sym = SYMBOLOGY_BY_ID[l.symbology];
      fields.push({
        id: l.id,
        label: sym.id === "ean13" ? "EAN-13 (código do produto)" : `Código ${sym.label}`,
        hint: sym.chars,
        value: l.value,
        kind: "barcode",
        multiline: false,
        maxLength: 60,
        placeholder: sym.placeholder,
      });
    } else if (l.kind === "qrcode") {
      fields.push({
        id: l.id,
        label: "URL / conteúdo do QR Code",
        hint: "Site, WhatsApp, link do imóvel ou qualquer texto.",
        value: l.value,
        kind: "qrcode",
        multiline: false,
        maxLength: MAX_URL,
        placeholder: "https://",
      });
    }
  }
  return fields;
}

/** Valida o valor digitado conforme o tipo de campo. */
export function checkQuickField(
  field: QuickField,
  raw: string,
  symbology?: Parameters<typeof validateValue>[0],
): QuickFieldCheck {
  const value = raw.trim();

  if (field.kind === "barcode") {
    if (!symbology) return { ok: true };
    const r = validateValue(symbology, value);
    return { ok: r.ok, message: r.ok ? undefined : r.message, fix: r.fix, info: r.info };
  }

  if (field.kind === "qrcode") {
    if (!value) return { ok: false, message: "Informe o conteúdo do QR Code." };
    if (value.length > MAX_URL) return { ok: false, message: `Máximo de ${MAX_URL} caracteres.` };
    if (/^https?:\/\//i.test(value)) {
      try {
        new URL(value);
      } catch {
        return { ok: false, message: "URL inválida — confira o endereço." };
      }
    } else if (/^www\./i.test(value)) {
      return { ok: false, message: "Falta o https:// no início do endereço.", fix: `https://${value}` };
    }
    return { ok: true };
  }

  if (!value) return { ok: false, message: "Campo vazio — a etiqueta sairá sem esse texto." };
  if (value.length > MAX_TEXT) return { ok: false, message: `Máximo de ${MAX_TEXT} caracteres.` };
  return { ok: true };
}
