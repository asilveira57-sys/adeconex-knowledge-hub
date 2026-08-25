-- Central de SEO & Tracking — Fase 1

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can read site settings" ON public.site_settings
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Admins can insert site settings" ON public.site_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update site settings" ON public.site_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete site settings" ON public.site_settings
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.settings_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings_history TO authenticated;
GRANT ALL ON public.settings_history TO service_role;
ALTER TABLE public.settings_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read settings history" ON public.settings_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SEO por página: campos completos (robots, Open Graph, Twitter, prioridade, notas)
ALTER TABLE public.seo_pages
  ADD COLUMN IF NOT EXISTS robots_meta text NOT NULL DEFAULT 'index,follow',
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS twitter_title text,
  ADD COLUMN IF NOT EXISTS twitter_description text,
  ADD COLUMN IF NOT EXISTS twitter_image text,
  ADD COLUMN IF NOT EXISTS seo_priority numeric,
  ADD COLUMN IF NOT EXISTS internal_notes text;

-- Redirecionamentos: observação interna
ALTER TABLE public.legacy_redirects
  ADD COLUMN IF NOT EXISTS notes text;

-- Valores iniciais das configurações (refletem o que hoje está fixo no código)
INSERT INTO public.site_settings (key, value) VALUES
  ('seo_general', jsonb_build_object(
    'site_name', 'Adeconex',
    'company_name', 'Adeconex',
    'site_url', 'https://www.adeconex.com.br',
    'canonical_domain', 'https://www.adeconex.com.br',
    'default_meta_title', 'Adeconex — Plataforma brasileira de impressão térmica e identificação',
    'default_meta_description', 'Conteúdo técnico, ferramentas gratuitas, produtos e suporte para impressão térmica, etiquetas e ribbons.',
    'default_meta_keywords', '',
    'default_og_image', '',
    'language', 'pt-BR',
    'country', 'BR',
    'phone', '', 'whatsapp', '', 'email', '',
    'social_instagram', 'https://www.instagram.com/adeconex',
    'social_youtube', 'https://www.youtube.com/@adeconex',
    'social_linkedin', 'https://www.linkedin.com/company/adeconex',
    'title_template_product', '{produto} | Adeconex Etiquetas',
    'title_template_category', '{categoria} | Adeconex',
    'title_template_post', '{titulo_post} | Adeconex'
  )),
  ('integration_ga4', jsonb_build_object('enabled', true, 'measurement_id', '', 'install_method', 'gtag', 'environment', 'production')),
  ('integration_gtm', jsonb_build_object('enabled', false, 'container_id', '', 'ga4_via_gtm', false, 'environment', 'production')),
  ('integration_google_ads', jsonb_build_object('enabled', false, 'ads_id', '', 'conversions', '[]'::jsonb, 'environment', 'production')),
  ('integration_meta_pixel', jsonb_build_object('enabled', false, 'pixel_id', '', 'environment', 'production')),
  ('integration_search_console', jsonb_build_object('verification_meta', 'IRfNtj5FyxXK1FcjCW7rcOzLrPec09X_F4n5dPSYRzU', 'property_domain', '', 'property_url_prefix', 'https://www.adeconex.com.br/' )),
  ('robots_txt', jsonb_build_object('content', 'User-agent: *
Allow: /

# Não indexar áreas privadas / autenticadas
Disallow: /b2b
', 'managed', false))
ON CONFLICT (key) DO NOTHING;