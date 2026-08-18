CREATE TABLE public.label_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  base_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  width_mm NUMERIC NOT NULL DEFAULT 100,
  height_mm NUMERIC NOT NULL DEFAULT 50,
  material TEXT NOT NULL DEFAULT 'couche_branco',
  ribbon_color TEXT NOT NULL DEFAULT '#111111',
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.label_designs TO authenticated;
GRANT ALL ON public.label_designs TO service_role;
ALTER TABLE public.label_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their label designs"
ON public.label_designs FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff can read all label designs"
ON public.label_designs FOR SELECT TO authenticated
USING (public.is_staff(auth.uid()));

CREATE INDEX idx_label_designs_user ON public.label_designs(user_id, updated_at DESC);

CREATE TRIGGER update_label_designs_updated_at
BEFORE UPDATE ON public.label_designs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.custom_label_price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_quantity INTEGER NOT NULL UNIQUE,
  unit_price NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.custom_label_price_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_label_price_tiers TO authenticated;
GRANT ALL ON public.custom_label_price_tiers TO service_role;
ALTER TABLE public.custom_label_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active price tiers"
ON public.custom_label_price_tiers FOR SELECT TO anon, authenticated
USING (is_active);

CREATE POLICY "Staff manage price tiers"
ON public.custom_label_price_tiers FOR ALL TO authenticated
USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER update_custom_label_price_tiers_updated_at
BEFORE UPDATE ON public.custom_label_price_tiers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.custom_label_price_tiers (min_quantity, unit_price) VALUES
  (100, 0.45),
  (500, 0.29),
  (1000, 0.19),
  (2000, 0.15),
  (5000, 0.12),
  (10000, 0.09);