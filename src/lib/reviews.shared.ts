/** Regras de avaliações de produtos (client-safe). */

export const REVIEW_MIN_BODY = 20;
export const REVIEW_MAX_IMAGES = 5;
export const REVIEW_MAX_VIDEOS = 1;
export const REVIEW_MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const REVIEW_MAX_VIDEO_SECONDS = 60;
export const REVIEW_MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Dias após a entrega para o 1º e-mail, e após ele para o único lembrete. */
export const REVIEW_REQUEST_DELAY_DAYS = 7;
export const REVIEW_REMINDER_DELAY_DAYS = 7;
export const REVIEW_TOKEN_TTL_DAYS = 60;

const DAY = 86_400_000;

/** Aceita apenas 0,5 a 5 em passos de 0,5. */
export function isValidRating(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0.5 && n <= 5 && Math.round(n * 2) === n * 2;
}

export type RatingStats = {
  count: number;
  average: number | null;
  /** Quantidade por faixa de estrelas (1 a 5); meias notas contam na faixa inferior (4,5 → 4). */
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function computeRatingStats(ratings: number[]): RatingStats {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingStats["distribution"];
  const valid = ratings.filter(isValidRating);
  for (const r of valid) {
    const bucket = Math.min(5, Math.max(1, Math.floor(r))) as 1 | 2 | 3 | 4 | 5;
    distribution[bucket] += 1;
  }
  const average = valid.length ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100 : null;
  return { count: valid.length, average, distribution };
}

/** Marca conteúdo que precisa de atenção antes de aprovar. */
export function moderationFlags(text: string): string[] {
  const t = (text ?? "").toLowerCase();
  const flags: string[] = [];
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|br|io|org)\b)/i.test(t)) flags.push("link");
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(t)) flags.push("email");
  if (/(\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}/.test(t)) flags.push("telefone");
  if (/\b(porra|caralho|merda|bosta|puta|fdp|vagabund\w*|lixo de empresa|idiota|otario|otário)\b/i.test(t)) flags.push("palavrao");
  return flags;
}

/** "Maria Silva Souza" -> "Maria S." */
export function abbreviateName(full: string | null | undefined): string {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Cliente";
  const first = parts[0][0].toUpperCase() + parts[0].slice(1).toLowerCase();
  return parts.length > 1 ? `${first} ${parts[parts.length - 1][0].toUpperCase()}.` : first;
}

export type ReviewRequestState = {
  deliveredAt: string | null;
  sentAt: string | null;
  reminderSentAt: string | null;
  completedAt: string | null;
};

/** Decide qual e-mail de avaliação está vencido agora. Nunca mais de 1 lembrete. */
export function dueReviewEmail(s: ReviewRequestState, now: Date = new Date()): "request" | "reminder" | null {
  if (s.completedAt || !s.deliveredAt) return null;
  const t = now.getTime();
  if (!s.sentAt) return t - new Date(s.deliveredAt).getTime() >= REVIEW_REQUEST_DELAY_DAYS * DAY ? "request" : null;
  if (s.reminderSentAt) return null;
  return t - new Date(s.sentAt).getTime() >= REVIEW_REMINDER_DELAY_DAYS * DAY ? "reminder" : null;
}

export function reviewTokenExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + REVIEW_TOKEN_TTL_DAYS * DAY);
}

export function isTokenExpired(expiresAt: string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function formatRating(n: number | null | undefined): string {
  if (n == null) return "–";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export const REVIEW_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Recusada",
  hidden: "Oculta",
};
