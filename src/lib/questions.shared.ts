export type QuestionContentType = "product" | "download" | "tool";
export type QuestionStatus = "pending" | "answered" | "published" | "cancelled";

export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  pending: "Pendente",
  answered: "Respondida",
  published: "Publicada",
  cancelled: "Cancelada",
};

export const CONTENT_TYPE_LABEL: Record<QuestionContentType, string> = {
  product: "Produto",
  download: "Download",
  tool: "Ferramenta",
};

export const QUESTION_MIN = 10;
export const QUESTION_MAX = 1000;
export const ANSWER_MAX = 4000;
/** Limite anti-spam: perguntas por cliente em 24 h. */
export const QUESTIONS_PER_DAY = 5;
export const QUESTIONS_PAGE_SIZE = 10;
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export const ANONYMOUS_LABEL = "Anônimo";

/** Páginas de ferramenta aceitas como destino de perguntas. */
const TOOL_PATH_RE = /^\/(ferramentas\/[a-z0-9-]+(\/[a-z0-9-]+)?|gerador-qrcode)$/;
export function normalizeToolPath(path: string): string | null {
  const p = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return TOOL_PATH_RE.test(p) ? p : null;
}

export const AVATAR_PRESETS = [
  { key: "gato", label: "Gato" },
  { key: "cafe", label: "Xícara de café" },
  { key: "arco-iris", label: "Arco-íris" },
  { key: "montanha", label: "Montanha" },
  { key: "planta", label: "Planta" },
  { key: "livro", label: "Livro" },
  { key: "geometrico", label: "Formas geométricas" },
] as const;
export type AvatarPresetKey = (typeof AVATAR_PRESETS)[number]["key"];
export const isAvatarPreset = (k: unknown): k is AvatarPresetKey =>
  typeof k === "string" && AVATAR_PRESETS.some((p) => p.key === k);

/** Normaliza o texto para detectar perguntas repetidas. */
export function questionFingerprint(t: string): string {
  return t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Detecta o tipo real da imagem pelos primeiros bytes. */
export function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "webp";
  return null;
}

/** avatar_url guarda "avatars/<caminho>" para fotos enviadas. */
export const AVATAR_STORAGE_PREFIX = "avatars/";

export type PublicQuestion = {
  id: string;
  question: string;
  answer: string;
  publishedAt: string;
  author: string;
  avatar: { kind: "preset"; key: AvatarPresetKey } | { kind: "upload"; path: string } | null;
};
