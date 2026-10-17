ALTER TABLE public.solution_recommendations ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE public.solution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.solution_journeys(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('view','start','step','complete','click_internal','click_external','click_affiliate','compare')),
  step_id uuid,
  rec_id uuid,
  session_id text NOT NULL,
  device text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX solution_events_journey_created_idx ON public.solution_events (journey_id, created_at);
GRANT SELECT ON public.solution_events TO authenticated;
GRANT ALL ON public.solution_events TO service_role;
ALTER TABLE public.solution_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read solution events" ON public.solution_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));