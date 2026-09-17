ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS packaging_box_id uuid REFERENCES public.packaging_boxes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_packaging_box_idx ON public.products (packaging_box_id);