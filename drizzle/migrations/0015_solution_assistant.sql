CREATE TABLE public.solution_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  short_description text,
  description text,
  cover_url text,
  cover_alt text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  seo_title text,
  seo_description text,
  seo_content text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.solution_journeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.solution_categories(id) ON DELETE SET NULL,
  admin_name text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  h1 text,
  intro text,
  cover_url text,
  cover_alt text,
  presentation text,
  closing text,
  content_before text,
  content_after text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','inactive')),
  sort_order int NOT NULL DEFAULT 0,
  seo_title text,
  seo_description text,
  canonical_url text,
  indexable boolean NOT NULL DEFAULT true,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.solution_journeys(category_id);
CREATE TABLE public.solution_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_id uuid NOT NULL REFERENCES public.solution_journeys(id) ON DELETE CASCADE,
  internal_name text,
  title text NOT NULL,
  body text,
  step_type text NOT NULL DEFAULT 'text' CHECK (step_type IN ('text','single','multiple','equipment','supplies','accessories','compare','final')),
  image_url text,
  image_alt text,
  sort_order int NOT NULL DEFAULT 0,
  is_required boolean NOT NULL DEFAULT false,
  guidance text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  condition jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.solution_steps(journey_id, sort_order);
CREATE TABLE public.solution_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id uuid NOT NULL REFERENCES public.solution_steps(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  item_category text NOT NULL DEFAULT 'outros',
  role text,
  reason text,
  is_required boolean NOT NULL DEFAULT false,
  quantity text,
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  show_when jsonb,
  ext_name text,
  ext_description text,
  ext_manufacturer text,
  ext_model text,
  ext_image_url text,
  ext_platform text,
  ext_original_url text,
  ext_affiliate_url text,
  is_affiliate boolean NOT NULL DEFAULT false,
  ext_offer_id text,
  ext_checked_at date,
  ext_link_status text NOT NULL DEFAULT 'ok',
  ext_button_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.solution_recommendations(step_id, sort_order);

GRANT SELECT ON public.solution_categories, public.solution_journeys, public.solution_steps, public.solution_recommendations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.solution_categories, public.solution_journeys, public.solution_steps, public.solution_recommendations TO authenticated;
GRANT ALL ON public.solution_categories, public.solution_journeys, public.solution_steps, public.solution_recommendations TO service_role;

ALTER TABLE public.solution_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read active categories" ON public.solution_categories FOR SELECT TO anon, authenticated USING (is_active OR public.is_staff(auth.uid()));
CREATE POLICY "staff write categories" ON public.solution_categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "public read published journeys" ON public.solution_journeys FOR SELECT TO anon, authenticated USING (status = 'published' OR public.is_staff(auth.uid()));
CREATE POLICY "staff write journeys" ON public.solution_journeys FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "public read steps" ON public.solution_steps FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.solution_journeys j WHERE j.id = journey_id AND j.status = 'published') OR public.is_staff(auth.uid()));
CREATE POLICY "staff write steps" ON public.solution_steps FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "public read recs" ON public.solution_recommendations FOR SELECT TO anon, authenticated USING ((is_active AND EXISTS (SELECT 1 FROM public.solution_steps s JOIN public.solution_journeys j ON j.id = s.journey_id WHERE s.id = step_id AND j.status = 'published')) OR public.is_staff(auth.uid()));
CREATE POLICY "staff write recs" ON public.solution_recommendations FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER t_sc_upd BEFORE UPDATE ON public.solution_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_sj_upd BEFORE UPDATE ON public.solution_journeys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_ss_upd BEFORE UPDATE ON public.solution_steps FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER t_sr_upd BEFORE UPDATE ON public.solution_recommendations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();