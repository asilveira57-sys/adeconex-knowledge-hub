/** Helpers server-only para a tela de artes (etiquetas personalizadas). */

export async function assertStaff(context: { supabase: any; userId: string }) {
  const { data: staff } = await context.supabase.rpc("is_staff", {
    _user_id: context.userId,
  });
  if (!staff) throw new Error("Forbidden");
}

/** Converte um data URL (image/png|jpeg) em bytes + content-type. */
export function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; contentType: string } {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) throw new Error("Pré-visualização da arte indisponível para este pedido");
  const contentType = match[1];
  if (!/^image\/(png|jpeg|webp)$/.test(contentType)) {
    throw new Error("Formato de arte não suportado");
  }
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, contentType };
}

export function slugifyFileName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase()
      .slice(0, 60) || "arte"
  );
}
