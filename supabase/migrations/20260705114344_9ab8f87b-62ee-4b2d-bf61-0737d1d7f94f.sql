
-- ============================================================================
-- ADECONEX 2030 — Fase 1: Fundação de dados do catálogo
-- ============================================================================

-- Extensões necessárias para busca e slugs
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================================================
-- ENUMS
-- ============================================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'viewer');

CREATE TYPE public.product_status AS ENUM (
  'imported', 'needs_review', 'enriched', 'published', 'hidden', 'discontinued'
);

CREATE TYPE public.availability_status AS ENUM (
  'in_stock', 'out_of_stock', 'preorder', 'discontinued', 'made_to_order'
);

CREATE TYPE public.image_type AS ENUM (
  'main', 'gallery', 'variant', 'lifestyle', 'technical', 'packaging'
);

CREATE TYPE public.video_platform AS ENUM (
  'youtube', 'vimeo', 'mp4', 'other'
);

CREATE TYPE public.relationship_type AS ENUM (
  'complementary', 'replacement', 'similar', 'required_accessory',
  'recommended_ribbon', 'recommended_label', 'same_family'
);

CREATE TYPE public.compatibility_type AS ENUM (
  'printer', 'marketplace', 'ribbon', 'label', 'software', 'device', 'brand', 'other'
);

CREATE TYPE public.seo_entity_type AS ENUM (
  'product', 'product_family', 'category', 'brand', 'material', 'application', 'market', 'page'
);

CREATE TYPE public.redirect_entity_type AS ENUM (
  'product', 'product_family', 'category', 'page', 'other'
);

CREATE TYPE public.import_action AS ENUM (
  'create', 'update', 'skip', 'error', 'link', 'enrich'
);

CREATE TYPE public.import_status AS ENUM (
  'success', 'warning', 'error'
);

-- ============================================================================
-- FUNÇÃO utilitária: updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PROFILES
-- ============================================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: cria profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- USER ROLES + has_role
-- ============================================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "user_roles_select_self_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Helper booleano: usuário atual é staff (admin ou editor)
CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'editor')
  )
$$;

-- ============================================================================
-- TAXONOMIA
-- ============================================================================

-- BRANDS
CREATE TABLE public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  website TEXT,
  logo_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands_public_read" ON public.brands FOR SELECT USING (is_published);
CREATE POLICY "brands_staff_read_all" ON public.brands FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "brands_staff_write" ON public.brands FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MATERIALS
CREATE TABLE public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  technical_notes TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.materials TO anon, authenticated;
GRANT ALL ON public.materials TO service_role;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_public_read" ON public.materials FOR SELECT USING (is_published);
CREATE POLICY "materials_staff_read_all" ON public.materials FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "materials_staff_write" ON public.materials FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- APPLICATIONS
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.applications TO anon, authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applications_public_read" ON public.applications FOR SELECT USING (is_published);
CREATE POLICY "applications_staff_read_all" ON public.applications FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "applications_staff_write" ON public.applications FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MARKETS
CREATE TABLE public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.markets TO anon, authenticated;
GRANT ALL ON public.markets TO service_role;
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "markets_public_read" ON public.markets FOR SELECT USING (is_published);
CREATE POLICY "markets_staff_read_all" ON public.markets FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "markets_staff_write" ON public.markets FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER markets_updated_at BEFORE UPDATE ON public.markets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CATEGORIES (hierárquicas)
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  legacy_id INTEGER,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX categories_parent_idx ON public.categories(parent_id);
CREATE INDEX categories_legacy_idx ON public.categories(legacy_id);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_public_read" ON public.categories FOR SELECT USING (is_published);
CREATE POLICY "categories_staff_read_all" ON public.categories FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "categories_staff_write" ON public.categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PRODUCT FAMILIES
CREATE TABLE public.product_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  canonical_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX product_families_name_trgm ON public.product_families USING GIN (name gin_trgm_ops);
GRANT SELECT ON public.product_families TO anon, authenticated;
GRANT ALL ON public.product_families TO service_role;
ALTER TABLE public.product_families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "families_public_read" ON public.product_families FOR SELECT USING (is_published);
CREATE POLICY "families_staff_read_all" ON public.product_families FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "families_staff_write" ON public.product_families FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER families_updated_at BEFORE UPDATE ON public.product_families FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- PRODUCTS
-- ============================================================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legacy_id INTEGER UNIQUE,
  legacy_store_id INTEGER,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  commercial_description TEXT,
  technical_description TEXT,
  raw_html TEXT, -- preserva original bruto para reprocessamento
  family_id UUID REFERENCES public.product_families(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  market_id UUID REFERENCES public.markets(id) ON DELETE SET NULL,

  sku TEXT,
  ean TEXT,
  model TEXT,
  reference TEXT,

  price NUMERIC(12,2),
  promotional_price NUMERIC(12,2),
  promo_starts_at TIMESTAMPTZ,
  promo_ends_at TIMESTAMPTZ,
  cost_price NUMERIC(12,2),
  weight_kg NUMERIC(10,3),

  stock_quantity INTEGER,
  min_stock INTEGER,
  availability_status public.availability_status NOT NULL DEFAULT 'in_stock',
  is_available BOOLEAN NOT NULL DEFAULT true,

  width_mm NUMERIC(10,2),
  height_mm NUMERIC(10,2),
  length_mm NUMERIC(10,2),
  roll_quantity INTEGER, -- etiquetas por rolo
  core_diameter_mm NUMERIC(10,2),
  color TEXT,
  adhesive_type TEXT,
  print_type TEXT, -- termica_direta, transferencia_termica, etc
  warranty TEXT,
  included_items TEXT,

  old_url TEXT,
  new_url TEXT,
  redirect_status TEXT NOT NULL DEFAULT 'pending', -- pending, applied, skipped
  status public.product_status NOT NULL DEFAULT 'imported',
  quality_flags JSONB NOT NULL DEFAULT '{}'::jsonb, -- ex: {"missing_image":true,"missing_price":false}

  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,

  imported_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX products_family_idx ON public.products(family_id);
CREATE INDEX products_category_idx ON public.products(category_id);
CREATE INDEX products_brand_idx ON public.products(brand_id);
CREATE INDEX products_material_idx ON public.products(material_id);
CREATE INDEX products_application_idx ON public.products(application_id);
CREATE INDEX products_status_idx ON public.products(status);
CREATE INDEX products_legacy_idx ON public.products(legacy_id);
CREATE INDEX products_name_trgm ON public.products USING GIN (name gin_trgm_ops);
CREATE INDEX products_search_trgm ON public.products USING GIN ((coalesce(name,'') || ' ' || coalesce(short_description,'')) gin_trgm_ops);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
-- Regra pública: qualquer visitante vê produtos publicados
CREATE POLICY "products_public_read" ON public.products FOR SELECT
  USING (status = 'published');
-- Staff vê tudo
CREATE POLICY "products_staff_read_all" ON public.products FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));
CREATE POLICY "products_staff_write" ON public.products FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- PRODUCT VARIANTS
-- ============================================================================
CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  legacy_id INTEGER,
  name TEXT,
  option1_name TEXT, -- ex: "Cor"
  option1_value TEXT, -- ex: "Amarelo"
  option2_name TEXT,
  option2_value TEXT,
  sku TEXT,
  ean TEXT,
  reference TEXT,
  price NUMERIC(12,2),
  promotional_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  stock_quantity INTEGER,
  weight_kg NUMERIC(10,3),
  width_mm NUMERIC(10,2),
  height_mm NUMERIC(10,2),
  length_mm NUMERIC(10,2),
  main_image_url TEXT,
  additional_images TEXT[],
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX variants_product_idx ON public.product_variants(product_id);
CREATE INDEX variants_legacy_idx ON public.product_variants(legacy_id);
GRANT SELECT ON public.product_variants TO anon, authenticated;
GRANT ALL ON public.product_variants TO service_role;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "variants_public_read" ON public.product_variants FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
);
CREATE POLICY "variants_staff_read_all" ON public.product_variants FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "variants_staff_write" ON public.product_variants FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER variants_updated_at BEFORE UPDATE ON public.product_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- PRODUCT_CATEGORIES (N:N adicional)
-- ============================================================================
CREATE TABLE public.product_categories (
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, category_id)
);
GRANT SELECT ON public.product_categories TO anon, authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pc_public_read" ON public.product_categories FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
);
CREATE POLICY "pc_staff_read_all" ON public.product_categories FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "pc_staff_write" ON public.product_categories FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============================================================================
-- IMAGES
-- ============================================================================
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  source_url TEXT, -- URL original (TCDN) enquanto não re-hospedada
  storage_path TEXT, -- caminho no bucket catalog-media quando re-hospedada
  image_type public.image_type NOT NULL DEFAULT 'gallery',
  position INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT,
  caption TEXT,
  is_main BOOLEAN NOT NULL DEFAULT false,
  width_px INTEGER,
  height_px INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX images_product_idx ON public.product_images(product_id);
CREATE INDEX images_variant_idx ON public.product_images(variant_id);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images_public_read" ON public.product_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
);
CREATE POLICY "images_staff_read_all" ON public.product_images FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "images_staff_write" ON public.product_images FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER images_updated_at BEFORE UPDATE ON public.product_images FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- VIDEOS
-- ============================================================================
CREATE TABLE public.product_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  platform public.video_platform NOT NULL DEFAULT 'youtube',
  title TEXT,
  description TEXT,
  transcript TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX videos_product_idx ON public.product_videos(product_id);
GRANT SELECT ON public.product_videos TO anon, authenticated;
GRANT ALL ON public.product_videos TO service_role;
ALTER TABLE public.product_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "videos_public_read" ON public.product_videos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
);
CREATE POLICY "videos_staff_read_all" ON public.product_videos FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "videos_staff_write" ON public.product_videos FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER videos_updated_at BEFORE UPDATE ON public.product_videos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SPECIFICATIONS
-- ============================================================================
CREATE TABLE public.product_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  spec_group TEXT,
  spec_name TEXT NOT NULL,
  spec_value TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX specs_product_idx ON public.product_specifications(product_id);
GRANT SELECT ON public.product_specifications TO anon, authenticated;
GRANT ALL ON public.product_specifications TO service_role;
ALTER TABLE public.product_specifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "specs_public_read" ON public.product_specifications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
);
CREATE POLICY "specs_staff_read_all" ON public.product_specifications FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "specs_staff_write" ON public.product_specifications FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER specs_updated_at BEFORE UPDATE ON public.product_specifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- COMPATIBILITIES
-- ============================================================================
CREATE TABLE public.product_compatibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  compatible_type public.compatibility_type NOT NULL,
  compatible_name TEXT NOT NULL,
  compatible_brand TEXT,
  compatible_model TEXT,
  notes TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX compat_product_idx ON public.product_compatibilities(product_id);
GRANT SELECT ON public.product_compatibilities TO anon, authenticated;
GRANT ALL ON public.product_compatibilities TO service_role;
ALTER TABLE public.product_compatibilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "compat_public_read" ON public.product_compatibilities FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
);
CREATE POLICY "compat_staff_read_all" ON public.product_compatibilities FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "compat_staff_write" ON public.product_compatibilities FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER compat_updated_at BEFORE UPDATE ON public.product_compatibilities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- RELATIONSHIPS
-- ============================================================================
CREATE TABLE public.product_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  related_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  relationship_type public.relationship_type NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, related_product_id, relationship_type),
  CHECK (product_id <> related_product_id)
);
CREATE INDEX rel_product_idx ON public.product_relationships(product_id);
CREATE INDEX rel_related_idx ON public.product_relationships(related_product_id);
GRANT SELECT ON public.product_relationships TO anon, authenticated;
GRANT ALL ON public.product_relationships TO service_role;
ALTER TABLE public.product_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rel_public_read" ON public.product_relationships FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
);
CREATE POLICY "rel_staff_read_all" ON public.product_relationships FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "rel_staff_write" ON public.product_relationships FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============================================================================
-- FAQs
-- ============================================================================
CREATE TABLE public.product_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  is_reviewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX faqs_product_idx ON public.product_faqs(product_id);
GRANT SELECT ON public.product_faqs TO anon, authenticated;
GRANT ALL ON public.product_faqs TO service_role;
ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs_public_read" ON public.product_faqs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published')
);
CREATE POLICY "faqs_staff_read_all" ON public.product_faqs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "faqs_staff_write" ON public.product_faqs FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER faqs_updated_at BEFORE UPDATE ON public.product_faqs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- SEO PAGES
-- ============================================================================
CREATE TABLE public.seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.seo_entity_type NOT NULL,
  entity_id UUID,
  path TEXT, -- ex: /etiquetas/mercado-livre
  title TEXT NOT NULL,
  meta_description TEXT,
  keywords TEXT,
  canonical_url TEXT,
  schema_type TEXT, -- ex: 'Product', 'ItemList', 'FAQPage'
  structured_data_json JSONB,
  indexable BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX seo_pages_path_idx ON public.seo_pages(path);
GRANT SELECT ON public.seo_pages TO anon, authenticated;
GRANT ALL ON public.seo_pages TO service_role;
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_public_read" ON public.seo_pages FOR SELECT USING (is_published);
CREATE POLICY "seo_staff_read_all" ON public.seo_pages FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "seo_staff_write" ON public.seo_pages FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER seo_pages_updated_at BEFORE UPDATE ON public.seo_pages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- LEGACY REDIRECTS
-- ============================================================================
CREATE TABLE public.legacy_redirects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_url TEXT NOT NULL UNIQUE,
  new_url TEXT NOT NULL,
  entity_type public.redirect_entity_type,
  entity_id UUID,
  http_status INTEGER NOT NULL DEFAULT 301,
  is_active BOOLEAN NOT NULL DEFAULT true,
  hits INTEGER NOT NULL DEFAULT 0,
  last_hit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX redirects_old_url_idx ON public.legacy_redirects(old_url);
CREATE INDEX redirects_active_idx ON public.legacy_redirects(is_active) WHERE is_active;
GRANT SELECT ON public.legacy_redirects TO anon, authenticated;
GRANT ALL ON public.legacy_redirects TO service_role;
ALTER TABLE public.legacy_redirects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "redirects_public_read" ON public.legacy_redirects FOR SELECT USING (is_active);
CREATE POLICY "redirects_staff_read_all" ON public.legacy_redirects FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "redirects_staff_write" ON public.legacy_redirects FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER redirects_updated_at BEFORE UPDATE ON public.legacy_redirects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- LEGACY IMPORT LOGS
-- ============================================================================
CREATE TABLE public.legacy_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID, -- agrupa uma execução de importação
  source_file TEXT,
  legacy_id TEXT,
  entity_type TEXT,
  entity_id UUID,
  action public.import_action NOT NULL,
  status public.import_status NOT NULL,
  message TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX import_logs_batch_idx ON public.legacy_import_logs(batch_id);
CREATE INDEX import_logs_status_idx ON public.legacy_import_logs(status);
GRANT SELECT ON public.legacy_import_logs TO authenticated;
GRANT ALL ON public.legacy_import_logs TO service_role;
ALTER TABLE public.legacy_import_logs ENABLE ROW LEVEL SECURITY;
-- Só staff vê logs de importação
CREATE POLICY "import_logs_staff_read" ON public.legacy_import_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "import_logs_staff_write" ON public.legacy_import_logs FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- ============================================================================
-- STORAGE POLICIES para bucket 'catalog-media' (private)
-- ============================================================================
-- Staff faz upload/leitura/delete; público não acessa direto (usaremos signed URLs)
CREATE POLICY "catalog_media_staff_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'catalog-media' AND public.is_staff(auth.uid()));
CREATE POLICY "catalog_media_staff_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'catalog-media' AND public.is_staff(auth.uid()));
CREATE POLICY "catalog_media_staff_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'catalog-media' AND public.is_staff(auth.uid()));
CREATE POLICY "catalog_media_staff_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'catalog-media' AND public.is_staff(auth.uid()));
