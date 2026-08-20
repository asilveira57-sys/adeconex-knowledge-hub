ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_customizable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_shape text NOT NULL DEFAULT 'rect',
  ADD COLUMN IF NOT EXISTS custom_width_mm numeric,
  ADD COLUMN IF NOT EXISTS custom_height_mm numeric,
  ADD COLUMN IF NOT EXISTS custom_corner_radius_mm numeric,
  ADD COLUMN IF NOT EXISTS custom_columns integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS custom_rows integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS custom_gap_x_mm numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS custom_gap_y_mm numeric NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS custom_margin_mm numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS custom_safe_margin_mm numeric NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS custom_notes text;

ALTER TABLE public.label_designs
  ADD COLUMN IF NOT EXISTS shape text NOT NULL DEFAULT 'rect',
  ADD COLUMN IF NOT EXISTS corner_radius_mm numeric;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_custom_shape_check') THEN
    ALTER TABLE public.products ADD CONSTRAINT products_custom_shape_check
      CHECK (custom_shape IN ('rect','rounded','circle','oval'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'label_designs_shape_check') THEN
    ALTER TABLE public.label_designs ADD CONSTRAINT label_designs_shape_check
      CHECK (shape IN ('rect','rounded','circle','oval'));
  END IF;
END $$;