ALTER TABLE public.marketplace_settings
  ADD COLUMN IF NOT EXISTS shopee_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shopee_store_slug text NOT NULL DEFAULT 'adeconex',
  ADD COLUMN IF NOT EXISTS shopee_search_url_template text NOT NULL DEFAULT 'https://shopee.com.br/search?keyword={q}&shop={store}',
  ADD COLUMN IF NOT EXISTS shopee_store_url text,
  ADD COLUMN IF NOT EXISTS shopee_button_label text NOT NULL DEFAULT 'Comprar na Shopee';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shopee_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS shopee_search_term text,
  ADD COLUMN IF NOT EXISTS shopee_url text;