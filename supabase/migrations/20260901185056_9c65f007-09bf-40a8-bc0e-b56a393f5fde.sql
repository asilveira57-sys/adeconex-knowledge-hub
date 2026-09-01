CREATE TABLE public.packaging_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  width_mm numeric NOT NULL,
  height_mm numeric NOT NULL,
  length_mm numeric NOT NULL,
  suggested_weight_kg numeric,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.packaging_boxes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_boxes TO authenticated;
GRANT ALL ON public.packaging_boxes TO service_role;

ALTER TABLE public.packaging_boxes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packaging_boxes_public_read" ON public.packaging_boxes
  FOR SELECT USING (is_active OR public.is_staff(auth.uid()));

CREATE POLICY "packaging_boxes_staff_write" ON public.packaging_boxes
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER packaging_boxes_updated_at
  BEFORE UPDATE ON public.packaging_boxes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.packaging_boxes (name, width_mm, height_mm, length_mm, suggested_weight_kg, sort_order) VALUES
  ('Caixa 01 - Pequena', 160, 60, 220, 0.3, 1),
  ('Caixa 02 - Média', 200, 100, 270, 0.6, 2),
  ('Caixa 03 - Grande', 300, 150, 400, 1.2, 3),
  ('Caixa 04 - Bobina', 250, 250, 250, 2.0, 4),
  ('Envelope de segurança', 200, 20, 280, 0.1, 5);