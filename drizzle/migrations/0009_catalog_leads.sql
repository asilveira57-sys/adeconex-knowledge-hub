CREATE TABLE public.catalog_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(12), 'hex'),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  consent boolean NOT NULL DEFAULT true,
  search_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_ids uuid[] NOT NULL DEFAULT '{}',
  channels text[] NOT NULL DEFAULT '{}',
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE, DELETE ON public.catalog_leads TO authenticated;
GRANT ALL ON public.catalog_leads TO service_role;
ALTER TABLE public.catalog_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read leads" ON public.catalog_leads FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff update leads" ON public.catalog_leads FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete leads" ON public.catalog_leads FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX catalog_leads_created_idx ON public.catalog_leads (created_at DESC);