/**
 * Construção e validação dos conteúdos ("payloads") dos QR Codes.
 * Tudo roda no navegador: nada aqui faz requisições nem persiste dados.
 */

export type QrType =
  | "url"
  | "text"
  | "whatsapp"
  | "phone"
  | "email"
  | "sms"
  | "wifi"
  | "geo"
  | "vcard"
  | "pix";

export const QR_TYPES: { value: QrType; label: string; hint: string }[] = [
  { value: "url", label: "Link / URL", hint: "Site, catálogo, landing page" },
  { value: "text", label: "Texto livre", hint: "Instruções, lote, código interno" },
  { value: "whatsapp", label: "WhatsApp", hint: "Conversa com mensagem pronta" },
  { value: "phone", label: "Telefone", hint: "Discagem direta" },
  { value: "email", label: "E-mail", hint: "Assunto e mensagem pré-preenchidos" },
  { value: "sms", label: "SMS", hint: "Mensagem de texto" },
  { value: "wifi", label: "Rede Wi-Fi", hint: "Conexão automática" },
  { value: "geo", label: "Localização", hint: "Coordenadas ou Google Maps" },
  { value: "vcard", label: "Contato (vCard)", hint: "Cartão de visita digital" },
  { value: "pix", label: "PIX Copia e Cola", hint: "Código PIX já gerado no banco" },
];

export type QrFormState = {
  url: string;
  text: string;
  waCountry: string;
  waArea: string;
  waNumber: string;
  waMessage: string;
  phoneCountry: string;
  phoneArea: string;
  phoneNumber: string;
  emailTo: string;
  emailSubject: string;
  emailBody: string;
  smsNumber: string;
  smsMessage: string;
  wifiSsid: string;
  wifiSecurity: "WPA" | "WEP" | "nopass";
  wifiPassword: string;
  wifiHidden: boolean;
  geoLat: string;
  geoLng: string;
  geoMapsUrl: string;
  vcFirstName: string;
  vcLastName: string;
  vcCompany: string;
  vcRole: string;
  vcPhone: string;
  vcMobile: string;
  vcEmail: string;
  vcWebsite: string;
  vcAddress: string;
  vcNotes: string;
  pixCode: string;
};

export const EMPTY_FORM: QrFormState = {
  url: "",
  text: "",
  waCountry: "55",
  waArea: "",
  waNumber: "",
  waMessage: "",
  phoneCountry: "55",
  phoneArea: "",
  phoneNumber: "",
  emailTo: "",
  emailSubject: "",
  emailBody: "",
  smsNumber: "",
  smsMessage: "",
  wifiSsid: "",
  wifiSecurity: "WPA",
  wifiPassword: "",
  wifiHidden: false,
  geoLat: "",
  geoLng: "",
  geoMapsUrl: "",
  vcFirstName: "",
  vcLastName: "",
  vcCompany: "",
  vcRole: "",
  vcPhone: "",
  vcMobile: "",
  vcEmail: "",
  vcWebsite: "",
  vcAddress: "",
  vcNotes: "",
  pixCode: "",
};

/** Remove caracteres de controle e limita o tamanho de qualquer campo digitado. */
export function sanitizeField(value: string, max = 1200): string {
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, max);
}

const digits = (v: string) => v.replace(/\D/g, "");

export function normalizeUrl(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v;
  if (/^(mailto|tel):/i.test(v)) return v;
  return `https://${v}`;
}

function isSafeUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

function escapeVcard(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([;,])/g, "\\$1");
}

/** Verificação estrutural (EMV) básica de um código PIX Copia e Cola. */
export function validatePixCode(code: string): { ok: boolean; message?: string } {
  const value = code.trim();
  if (!value) return { ok: false, message: "Cole o código PIX Copia e Cola." };
  if (!/^000201/.test(value)) {
    return { ok: false, message: "O código deve começar com 000201 (padrão PIX)." };
  }
  if (!/[0-9A-Za-z]{4}$/.test(value)) {
    return { ok: false, message: "O código parece incompleto (falta o final de verificação)." };
  }
  if (value.length < 40) return { ok: false, message: "Código PIX muito curto." };
  // percorre os campos TLV
  let i = 0;
  while (i < value.length) {
    const id = value.slice(i, i + 2);
    const lenRaw = value.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenRaw)) {
      return { ok: false, message: "Estrutura do código PIX inválida." };
    }
    const len = Number(lenRaw);
    i += 4 + len;
    if (i > value.length) {
      return { ok: false, message: "Estrutura do código PIX inválida." };
    }
    if (id === "63") return { ok: true };
  }
  return { ok: true };
}

export type BuildResult = {
  /** conteúdo final codificado no QR Code */
  value: string;
  /** erro impeditivo (nada é gerado) */
  error?: string;
  /** alerta não impeditivo */
  warning?: string;
  /** destino que pode ser aberto pelo botão "Testar conteúdo" */
  testUrl?: string;
};

export function buildPayload(type: QrType, f: QrFormState): BuildResult {
  switch (type) {
    case "url": {
      if (!f.url.trim()) return { value: "", error: "Informe o endereço do site." };
      const normalized = normalizeUrl(f.url);
      if (!isSafeUrl(normalized)) {
        return { value: "", error: "Endereço inválido. Use um link http:// ou https://." };
      }
      return { value: normalized, testUrl: normalized };
    }
    case "text": {
      const v = f.text.trim();
      if (!v) return { value: "", error: "Escreva o texto que ficará no QR Code." };
      return {
        value: v,
        warning:
          v.length > 300
            ? "Texto longo: o QR Code fica mais denso. Imprima em tamanho maior."
            : undefined,
      };
    }
    case "whatsapp": {
      const country = digits(f.waCountry);
      const area = digits(f.waArea);
      const number = digits(f.waNumber);
      if (!country) return { value: "", error: "Informe o código do país." };
      if (!area) return { value: "", error: "Informe o DDD." };
      if (number.length < 8) return { value: "", error: "Informe o número completo do WhatsApp." };
      const full = `${country}${area}${number}`;
      const msg = f.waMessage.trim();
      const link = `https://wa.me/${full}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
      return { value: link, testUrl: link };
    }
    case "phone": {
      const country = digits(f.phoneCountry);
      const area = digits(f.phoneArea);
      const number = digits(f.phoneNumber);
      if (!number || number.length < 8) return { value: "", error: "Informe o número completo." };
      return { value: `tel:+${country}${area}${number}` };
    }
    case "email": {
      const to = f.emailTo.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
        return { value: "", error: "Informe um e-mail válido." };
      }
      const params: string[] = [];
      if (f.emailSubject.trim()) params.push(`subject=${encodeURIComponent(f.emailSubject.trim())}`);
      if (f.emailBody.trim()) params.push(`body=${encodeURIComponent(f.emailBody.trim())}`);
      return { value: `mailto:${to}${params.length ? `?${params.join("&")}` : ""}` };
    }
    case "sms": {
      const number = digits(f.smsNumber);
      if (number.length < 8) return { value: "", error: "Informe o número que receberá o SMS." };
      const msg = f.smsMessage.trim();
      return { value: `SMSTO:+${number}:${msg}` };
    }
    case "wifi": {
      if (!f.wifiSsid.trim()) return { value: "", error: "Informe o nome da rede (SSID)." };
      if (f.wifiSecurity !== "nopass" && !f.wifiPassword) {
        return { value: "", error: "Informe a senha da rede ou escolha “Sem senha”." };
      }
      const parts = [
        `T:${f.wifiSecurity}`,
        `S:${escapeWifi(f.wifiSsid.trim())}`,
        f.wifiSecurity !== "nopass" ? `P:${escapeWifi(f.wifiPassword)}` : "",
        f.wifiHidden ? "H:true" : "",
      ].filter(Boolean);
      return { value: `WIFI:${parts.join(";")};;` };
    }
    case "geo": {
      const maps = f.geoMapsUrl.trim();
      if (maps) {
        const normalized = normalizeUrl(maps);
        if (!isSafeUrl(normalized)) return { value: "", error: "Link do mapa inválido." };
        return { value: normalized, testUrl: normalized };
      }
      const lat = Number(f.geoLat.replace(",", "."));
      const lng = Number(f.geoLng.replace(",", "."));
      if (!f.geoLat.trim() || !f.geoLng.trim() || Number.isNaN(lat) || Number.isNaN(lng)) {
        return { value: "", error: "Informe latitude e longitude, ou um link do Google Maps." };
      }
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return { value: "", error: "Coordenadas fora do intervalo válido." };
      }
      return {
        value: `geo:${lat},${lng}`,
        testUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      };
    }
    case "vcard": {
      if (!f.vcFirstName.trim() && !f.vcLastName.trim() && !f.vcCompany.trim()) {
        return { value: "", error: "Informe ao menos o nome ou a empresa." };
      }
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVcard(f.vcLastName.trim())};${escapeVcard(f.vcFirstName.trim())};;;`,
        `FN:${escapeVcard(`${f.vcFirstName.trim()} ${f.vcLastName.trim()}`.trim())}`,
        f.vcCompany.trim() ? `ORG:${escapeVcard(f.vcCompany.trim())}` : "",
        f.vcRole.trim() ? `TITLE:${escapeVcard(f.vcRole.trim())}` : "",
        f.vcPhone.trim() ? `TEL;TYPE=WORK,VOICE:${escapeVcard(f.vcPhone.trim())}` : "",
        f.vcMobile.trim() ? `TEL;TYPE=CELL:${escapeVcard(f.vcMobile.trim())}` : "",
        f.vcEmail.trim() ? `EMAIL;TYPE=INTERNET:${escapeVcard(f.vcEmail.trim())}` : "",
        f.vcWebsite.trim() ? `URL:${escapeVcard(normalizeUrl(f.vcWebsite))}` : "",
        f.vcAddress.trim() ? `ADR;TYPE=WORK:;;${escapeVcard(f.vcAddress.trim())};;;;` : "",
        f.vcNotes.trim() ? `NOTE:${escapeVcard(f.vcNotes.trim())}` : "",
        "END:VCARD",
      ].filter(Boolean);
      const value = lines.join("\n");
      return {
        value,
        warning:
          value.length > 350
            ? "Contato extenso: o QR Code fica denso. Prefira imprimir acima de 30 mm."
            : undefined,
      };
    }
    case "pix": {
      const code = f.pixCode.trim();
      const check = validatePixCode(code);
      if (!check.ok) return { value: "", error: check.message };
      return {
        value: code,
        warning: "Confira sempre os dados do recebedor no aplicativo do banco antes de pagar.",
      };
    }
    default:
      return { value: "", error: "Tipo não suportado." };
  }
}
