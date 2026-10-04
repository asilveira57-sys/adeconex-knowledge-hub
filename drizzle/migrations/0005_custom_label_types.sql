CREATE TABLE public.custom_label_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_description text,
  usage text,
  cover_url text,
  sizes jsonb NOT NULL DEFAULT '[]'::jsonb,
  blog_title text,
  blog_excerpt text,
  blog_body text,
  blog_tips text,
  blog_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.custom_label_types TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_label_types TO authenticated;
GRANT ALL ON public.custom_label_types TO service_role;
ALTER TABLE public.custom_label_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published label types" ON public.custom_label_types FOR SELECT TO anon USING (is_published);
CREATE POLICY "Auth read label types" ON public.custom_label_types FOR SELECT TO authenticated USING (is_published OR public.is_staff(auth.uid()));
CREATE POLICY "Staff insert label types" ON public.custom_label_types FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update label types" ON public.custom_label_types FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete label types" ON public.custom_label_types FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER custom_label_types_updated_at BEFORE UPDATE ON public.custom_label_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.label_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id uuid NOT NULL REFERENCES public.custom_label_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  width_mm numeric NOT NULL,
  height_mm numeric NOT NULL,
  shape text NOT NULL DEFAULT 'rect',
  corner_radius_mm numeric,
  material text NOT NULL DEFAULT 'couche_branco',
  ribbon_color text NOT NULL DEFAULT '#111111',
  background_color text NOT NULL DEFAULT '#ffffff',
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX label_templates_type_idx ON public.label_templates(type_id);
GRANT SELECT ON public.label_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_templates TO authenticated;
GRANT ALL ON public.label_templates TO service_role;
ALTER TABLE public.label_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read published templates" ON public.label_templates FOR SELECT TO anon USING (is_published AND EXISTS (SELECT 1 FROM public.custom_label_types t WHERE t.id = type_id AND t.is_published));
CREATE POLICY "Auth read templates" ON public.label_templates FOR SELECT TO authenticated USING (public.is_staff(auth.uid()) OR (is_published AND EXISTS (SELECT 1 FROM public.custom_label_types t WHERE t.id = type_id AND t.is_published)));
CREATE POLICY "Staff insert templates" ON public.label_templates FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff update templates" ON public.label_templates FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Staff delete templates" ON public.label_templates FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER label_templates_updated_at BEFORE UPDATE ON public.label_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();