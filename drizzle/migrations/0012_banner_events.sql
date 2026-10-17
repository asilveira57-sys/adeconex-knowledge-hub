CREATE TABLE public.banner_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  banner_id uuid NOT NULL,
  placement text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('impression','click')),
  visitor_id text,
  session_id text,
  device text,
  path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX banner_events_created_idx ON public.banner_events (created_at, placement);
CREATE INDEX banner_events_banner_idx ON public.banner_events (banner_id, created_at);
GRANT SELECT ON public.banner_events TO authenticated;
GRANT ALL ON public.banner_events TO service_role;
ALTER TABLE public.banner_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read banner events" ON public.banner_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));