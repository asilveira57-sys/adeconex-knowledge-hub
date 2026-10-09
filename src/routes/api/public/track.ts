import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  visitor_id: z.string().min(8).max(40).regex(/^[\w-]+$/),
  session_id: z.string().min(8).max(40).regex(/^[\w-]+$/),
  event_type: z.enum(["page_view", "view_item", "add_to_cart", "begin_checkout"]),
  path: z.string().max(300).optional(),
  product_id: z.string().uuid().optional(),
  referrer_host: z.string().max(120).optional(),
  utm_source: z.string().max(80).optional(),
  device: z.enum(["mobile", "desktop"]).optional(),
});

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ua = request.headers.get("user-agent") ?? "";
        if (!ua || /bot|crawl|spider|headless|lighthouse|preview/i.test(ua)) return new Response(null, { status: 204 });
        const text = await request.text();
        if (text.length > 2000) return new Response(null, { status: 413 });
        let parsed;
        try { parsed = schema.safeParse(JSON.parse(text)); } catch { return new Response(null, { status: 400 }); }
        if (!parsed.success) return new Response(null, { status: 400 });
        const d = parsed.data;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("site_events").insert({
          visitor_id: d.visitor_id,
          session_id: d.session_id,
          event_type: d.event_type,
          path: d.path ?? null,
          product_id: d.product_id ?? null,
          referrer_host: d.referrer_host || null,
          utm_source: d.utm_source || null,
          device: d.device ?? null,
        });
        return new Response(null, { status: 204 });
      },
    },
  },
});
