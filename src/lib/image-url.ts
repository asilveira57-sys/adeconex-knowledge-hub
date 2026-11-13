/**
 * Imagens do catálogo servidas pela transformação do Supabase Storage
 * (/storage/v1/render/image/public/...): redimensiona e entrega WebP
 * automaticamente para navegadores que aceitam.
 *
 * Interruptor único: se a transformação ficar indisponível ou cara, troque
 * IMAGE_TRANSFORM_ENABLED para false e tudo volta a usar o arquivo original.
 */
export const IMAGE_TRANSFORM_ENABLED = true;

const OBJECT_SEG = "/storage/v1/object/public/";
const RENDER_SEG = "/storage/v1/render/image/public/";

/** Larguras geradas. Poucas larguras = mais acerto de cache na CDN. */
export const IMAGE_WIDTHS = [240, 400, 640, 960] as const;

function isTransformable(url: string | null | undefined): url is string {
  return !!url && IMAGE_TRANSFORM_ENABLED && url.includes(OBJECT_SEG) && !/\.(svg|gif)(\?|$)/i.test(url);
}

/** URL redimensionada pela largura (só width → mantém a proporção, não corta). */
export function resizedImageUrl(url: string | null | undefined, width: number, quality = 72): string | null {
  if (!url) return null;
  if (!isTransformable(url)) return url;
  const [path] = url.split("?");
  return `${path.replace(OBJECT_SEG, RENDER_SEG)}?width=${width}&quality=${quality}`;
}

/** srcset com as larguras padrão até `maxWidth`. Vazio quando não transformável. */
export function imageSrcSet(url: string | null | undefined, maxWidth = 960, quality = 72): string | undefined {
  if (!isTransformable(url)) return undefined;
  return IMAGE_WIDTHS.filter((w) => w <= maxWidth)
    .map((w) => `${resizedImageUrl(url, w, quality)} ${w}w`)
    .join(", ");
}
