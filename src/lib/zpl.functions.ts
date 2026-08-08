import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Renderização de ZPL via API pública da Labelary.
 * O proxy no servidor evita bloqueio de CORS e mantém o navegador limpo.
 */

const schema = z.object({
  zpl: z.string().min(1, "Informe o código ZPL.").max(60_000),
  dpmm: z.enum(["6dpmm", "8dpmm", "12dpmm", "24dpmm"]).default("8dpmm"),
  width: z.number().min(0.5).max(15),
  height: z.number().min(0.5).max(30),
  index: z.number().int().min(0).max(50).default(0),
  format: z.enum(["png", "pdf"]).default("png"),
  rotation: z.enum(["0", "90", "180", "270"]).default("0"),
});

export const renderZpl = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const url = `https://api.labelary.com/v1/printers/${data.dpmm}/labels/${data.width}x${data.height}/${data.index}/`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: data.format === "pdf" ? "application/pdf" : "image/png",
        "X-Rotation": data.rotation,
      },
      body: data.zpl,
    });

    if (!res.ok) {
      const message = await res.text().catch(() => "");
      return {
        ok: false as const,
        error:
          message.trim() ||
          `A Labelary recusou o código (HTTP ${res.status}). Revise os comandos ZPL.`,
      };
    }

    const buffer = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    for (let i = 0; i < buffer.length; i += 8192) {
      binary += String.fromCharCode(...buffer.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);
    const totalCount = Number(res.headers.get("X-Total-Count") ?? "1");

    return {
      ok: true as const,
      dataUrl: `data:${data.format === "pdf" ? "application/pdf" : "image/png"};base64,${base64}`,
      totalCount: Number.isFinite(totalCount) && totalCount > 0 ? totalCount : 1,
    };
  });
