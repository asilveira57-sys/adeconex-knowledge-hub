CREATE TABLE public.institutional_pages (
  key text PRIMARY KEY,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.institutional_pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutional_pages TO authenticated;
GRANT ALL ON public.institutional_pages TO service_role;
ALTER TABLE public.institutional_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read institutional pages" ON public.institutional_pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Staff insert institutional pages" ON public.institutional_pages FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update institutional pages" ON public.institutional_pages FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete institutional pages" ON public.institutional_pages FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));