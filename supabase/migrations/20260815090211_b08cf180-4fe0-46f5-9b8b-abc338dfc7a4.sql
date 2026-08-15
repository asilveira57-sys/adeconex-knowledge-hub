ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ml_search_term text,
  ADD COLUMN IF NOT EXISTS ml_url text,
  ADD COLUMN IF NOT EXISTS ml_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.marketplace_settings (
  id text PRIMARY KEY DEFAULT 'default',
  ml_enabled boolean NOT NULL DEFAULT true,
  ml_store_slug text NOT NULL DEFAULT 'adeconex',
  ml_search_url_template text NOT NULL DEFAULT 'https://lista.mercadolivre.com.br/{q}_Loja_{store}',
  ml_store_url text,
  ml_button_label text NOT NULL DEFAULT 'Comprar no Mercado Livre',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketplace_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_settings TO authenticated;
GRANT ALL ON public.marketplace_settings TO service_role;

ALTER TABLE public.marketplace_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_settings_public_read" ON public.marketplace_settings
  FOR SELECT USING (true);

CREATE POLICY "marketplace_settings_staff_write" ON public.marketplace_settings
  FOR ALL TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

INSERT INTO public.marketplace_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;