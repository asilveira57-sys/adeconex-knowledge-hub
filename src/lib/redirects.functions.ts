import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Resolve um path contra os redirects cadastrados no admin (legacy_redirects). */
export const resolveDbRedirect = createServerFn({ method: "GET" })
  .inputValidator((v) => z.object({ path: z.string().min(1).max(2048) }).parse(v))
  .handler(async ({ data }) => {
    const { findDbRedirect } = await import("@/lib/redirects.server");
    return findDbRedirect(data.path);
  });
