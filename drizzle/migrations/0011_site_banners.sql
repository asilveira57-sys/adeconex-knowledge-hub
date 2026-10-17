CREATE TABLE public.site_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  placement text NOT NULL DEFAULT 'home_hero',
  page_path text,
  name text NOT NULL DEFAULT '',
  title text,
  subtitle text,
  cta_label text,
  image_desktop_url text NOT NULL,
  image_mobile_url text,
  alt text NOT NULL DEFAULT '',
  link_url text,
  open_new_tab boolean NOT NULL DEFAULT false,
  nofollow boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT site_banners_placement_chk CHECK (placement IN ('home_hero','home_secondary','page_top'))
);
CREATE INDEX site_banners_placement_idx ON public.site_banners (placement, active, sort_order);
GRANT SELECT ON public.site_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_banners TO authenticated;
GRANT ALL ON public.site_banners TO service_role;
ALTER TABLE public.site_banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active banners" ON public.site_banners FOR SELECT TO anon, authenticated USING (active OR public.is_staff(auth.uid()));
CREATE POLICY "Staff insert banners" ON public.site_banners FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update banners" ON public.site_banners FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete banners" ON public.site_banners FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));