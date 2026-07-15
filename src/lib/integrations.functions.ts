import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Fase 11 — endpoints admin para a integração com o sistema interno.
 * O disparo automático acontece no webhook do Mercado Pago quando o pedido
 * é confirmado como pago; aqui expomos listagem de logs e reenvio manual.
 */

async function assertStaff(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("is_staff", {
    _user_id: context.userId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const listIntegrationLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ orderId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { data: rows, error } = await context.supabase
      .from("integration_logs")
      .select("id, provider, action, success, status_code, error_message, response, created_at")
      .eq("order_id", data.orderId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return { logs: rows ?? [] };
  });

export const resendOrderIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ orderId: z.string().uuid() }).parse(v))
  .handler(async ({ context, data }) => {
    await assertStaff(context);
    const { sendOrderToInternal } = await import("@/lib/integrations.server");
    const result = await sendOrderToInternal(data.orderId);
    return result;
  });
