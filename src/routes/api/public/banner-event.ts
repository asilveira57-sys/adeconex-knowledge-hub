import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  banner_id: z.string().uuid(),
  placement: z.enum(["home_hero", "home_secondary", "page_top"]),
  event_type: z.enum(["impression", "click"]),
  visitor_id: z.string().min(8).max(40).regex(/^[\w-]+$/),
  session_id: z.string().min(8).max(40).regex(/^[\w-]+$/),
  path: z.string().max(300).optional(),
  device: z.enum(["mobile", "desktop"]).optional(),
});

/** Registra visualizações e cliques de banners (anônimo, sem dados pessoais). */
export const Route = createFileRoute("/api/public/banner-event")({
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
        const { data: banner } = await supabaseAdmin.from("site_banners").select("id, placement").eq("id", d.banner_id).maybeSingle();
        if (!banner || banner.placement !== d.placement) return new Response(null, { status: 204 });
        await supabaseAdmin.from("banner_events").insert({
          banner_id: d.banner_id, placement: d.placement, event_type: d.event_type,
          visitor_id: d.visitor_id, session_id: d.session_id, path: d.path ?? null, device: d.device ?? null,
        });
        return new Response(null, { status: 204 });
      },
    },
  },
});
