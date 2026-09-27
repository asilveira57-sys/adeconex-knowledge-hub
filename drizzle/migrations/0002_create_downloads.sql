CREATE TABLE public.downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  kind text NOT NULL DEFAULT 'driver' CHECK (kind IN ('driver','software','manual','datasheet','zpl','template')),
  title text NOT NULL,
  brand text,
  model text,
  version text,
  operating_system text,
  download_url text NOT NULL,
  file_size text,
  summary text,
  content_html text,
  image_url text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  legacy_path text,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.downloads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.downloads TO authenticated;
GRANT ALL ON public.downloads TO service_role;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published downloads" ON public.downloads FOR SELECT TO anon, authenticated USING (is_published OR public.is_staff(auth.uid()));
CREATE POLICY "Staff inserts downloads" ON public.downloads FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff updates downloads" ON public.downloads FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff deletes downloads" ON public.downloads FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE INDEX downloads_kind_idx ON public.downloads(kind);
CREATE TRIGGER downloads_updated_at BEFORE UPDATE ON public.downloads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();