CREATE TABLE public.site_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id text NOT NULL,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('page_view','view_item','add_to_cart','begin_checkout')),
  path text,
  product_id uuid,
  referrer_host text,
  utm_source text,
  device text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_events TO authenticated;
GRANT ALL ON public.site_events TO service_role;
ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read site events" ON public.site_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX site_events_created_idx ON public.site_events (created_at);
CREATE INDEX site_events_type_created_idx ON public.site_events (event_type, created_at);
CREATE INDEX site_events_product_idx ON public.site_events (product_id) WHERE product_id IS NOT NULL;