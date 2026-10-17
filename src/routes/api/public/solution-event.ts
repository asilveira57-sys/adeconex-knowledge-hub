import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  journey_slug: z.string().min(1).max(120),
  event_type: z.enum(["view", "start", "step", "complete", "click_internal", "click_external", "click_affiliate", "compare"]),
  step_id: z.string().uuid().optional(),
  rec_id: z.string().uuid().optional(),
  session_id: z.string().min(8).max(40).regex(/^[\w-]+$/),
  device: z.enum(["mobile", "desktop"]).optional(),
});

/** Registra uso do assistente "Comece por aqui" (anônimo, sem dados pessoais). */
export const Route = createFileRoute("/api/public/solution-event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ua = request.headers.get("user-agent") ?? "";
        if (!ua || /bot|crawl|spider|headless|lighthouse|preview/i.test(ua)) return new Response(null, { status: 204 });
        const text = await request.text();
        if (text.length > 1000) return new Response(null, { status: 413 });
        let parsed;
        try { parsed = schema.safeParse(JSON.parse(text)); } catch { return new Response(null, { status: 400 }); }
        if (!parsed.success) return new Response(null, { status: 400 });
        const d = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: j } = await supabaseAdmin.from("solution_journeys").select("id").eq("slug", d.journey_slug).eq("status", "published").maybeSingle();
        if (!j) return new Response(null, { status: 204 });
        await supabaseAdmin.from("solution_events").insert({
          journey_id: j.id, event_type: d.event_type, step_id: d.step_id ?? null, rec_id: d.rec_id ?? null,
          session_id: d.session_id, device: d.device ?? null,
        });
        return new Response(null, { status: 204 });
      },
    },
  },
});
