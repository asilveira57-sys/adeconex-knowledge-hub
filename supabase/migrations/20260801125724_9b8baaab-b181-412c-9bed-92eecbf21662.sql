CREATE TYPE public.badge_source AS ENUM ('manual', 'auto');
CREATE TYPE public.badge_auto_rule AS ENUM ('none', 'best_seller', 'low_stock', 'new_arrival', 'on_sale', 'free_shipping');

CREATE TABLE public.product_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT 'primary',
  icon text,
  priority integer NOT NULL DEFAULT 100,
  auto_rule public.badge_auto_rule NOT NULL DEFAULT 'none',
  rule_threshold numeric,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_badges TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_badges TO authenticated;
GRANT ALL ON public.product_badges TO service_role;
ALTER TABLE public.product_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badges are publicly readable" ON public.product_badges
  FOR SELECT USING (true);
CREATE POLICY "Staff manage badges" ON public.product_badges
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.product_badge_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.product_badges(id) ON DELETE CASCADE,
  source public.badge_source NOT NULL DEFAULT 'manual',
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, badge_id)
);

CREATE INDEX product_badge_assignments_product_idx ON public.product_badge_assignments(product_id);

GRANT SELECT ON public.product_badge_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_badge_assignments TO authenticated;
GRANT ALL ON public.product_badge_assignments TO service_role;
ALTER TABLE public.product_badge_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Badge assignments are publicly readable" ON public.product_badge_assignments
  FOR SELECT USING (true);
CREATE POLICY "Staff manage badge assignments" ON public.product_badge_assignments
  FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER product_badges_updated_at BEFORE UPDATE ON public.product_badges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER product_badge_assignments_updated_at BEFORE UPDATE ON public.product_badge_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.product_badges (key, label, color, icon, priority, auto_rule, rule_threshold) VALUES
  ('best_seller', 'Mais vendido', 'primary', 'flame', 10, 'best_seller', 12),
  ('champion', 'Campeão de vendas', 'accent', 'trophy', 20, 'none', NULL),
  ('low_stock', 'Últimas unidades', 'destructive', 'alert-triangle', 30, 'low_stock', 5),
  ('new_arrival', 'Novidade', 'secondary', 'sparkles', 40, 'new_arrival', 30),
  ('on_sale', 'Promoção', 'destructive', 'tag', 50, 'on_sale', NULL),
  ('free_shipping', 'Frete grátis', 'success', 'truck', 60, 'free_shipping', NULL);