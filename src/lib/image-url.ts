import type { SyntheticEvent } from "react";

/**
 * Imagens do catálogo otimizadas pelo wsrv.nl — proxy de imagens gratuito
 * (sem conta, sem cobrança): redimensiona, converte para WebP e cacheia em CDN.
 * Não usamos a transformação do Supabase Storage porque ela é cobrada por imagem.
 *
 * Segurança: todo <img> que usa estas URLs deve ter onError={fallbackToOriginal(original)},
 * que volta para o arquivo original do Supabase se o wsrv.nl falhar.
 * Interruptor único: IMAGE_OPTIMIZATION_ENABLED = false volta tudo ao original.
 */
export const IMAGE_OPTIMIZATION_ENABLED = true;

const PROXY = "https://wsrv.nl/";
const OBJECT_SEG = "/storage/v1/object/public/";

/** Larguras geradas. Poucas larguras = mais acerto de cache. */
export const IMAGE_WIDTHS = [240, 400, 640, 960] as const;

function isOptimizable(url: string | null | undefined): url is string {
  return !!url && IMAGE_OPTIMIZATION_ENABLED && url.includes(OBJECT_SEG) && !/\.(svg|gif)(\?|$)/i.test(url);
}

/** URL redimensionada pela largura, em WebP, sem ampliar imagens menores (we). */
export function resizedImageUrl(url: string | null | undefined, width: number, quality = 75): string | null {
  if (!url) return null;
  if (!isOptimizable(url)) return url;
  return `${PROXY}?url=${encodeURIComponent(url)}&w=${width}&q=${quality}&output=webp&we`;
}

/** srcset com as larguras padrão até `maxWidth`. Vazio quando não otimizável. */
export function imageSrcSet(url: string | null | undefined, maxWidth = 960, quality = 75): string | undefined {
  if (!isOptimizable(url)) return undefined;
  return IMAGE_WIDTHS.filter((w) => w <= maxWidth)
    .map((w) => `${resizedImageUrl(url, w, quality)} ${w}w`)
    .join(", ");
}

/** onError: se a versão otimizada falhar, carrega o arquivo original (uma vez). */
export function fallbackToOriginal(original: string | null | undefined) {
  return (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (!original || img.dataset.fallback === "1") return;
    img.dataset.fallback = "1";
    img.removeAttribute("srcset");
    img.src = original;
  };
}
