
-- ============ ENUMS ============
CREATE TYPE public.bundle_discount_type AS ENUM (
  'percent', 'fixed', 'fixed_price', 'complement_percent', 'complement_fixed'
);

CREATE TYPE public.bundle_variant_scope AS ENUM ('any', 'specific', 'any_kit');

-- ============ bundle_offers ============
CREATE TABLE public.bundle_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  discount_type public.bundle_discount_type NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  allow_stack_with_coupon boolean NOT NULL DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  impressions bigint NOT NULL DEFAULT 0,
  add_to_cart_count bigint NOT NULL DEFAULT 0,
  conversions bigint NOT NULL DEFAULT 0,
  revenue_total numeric NOT NULL DEFAULT 0,
  discount_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bundle_offers_product_idx ON public.bundle_offers(product_id) WHERE is_active;
CREATE INDEX bundle_offers_active_idx ON public.bundle_offers(is_active);

GRANT SELECT ON public.bundle_offers TO anon, authenticated;
GRANT ALL ON public.bundle_offers TO service_role;

ALTER TABLE public.bundle_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_offers public read active"
  ON public.bundle_offers FOR SELECT
  TO anon, authenticated
  USING (
    is_active
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at >= now())
  );

CREATE POLICY "bundle_offers staff read all"
  ON public.bundle_offers FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "bundle_offers staff write"
  ON public.bundle_offers FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_bundle_offers_updated
  BEFORE UPDATE ON public.bundle_offers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ bundle_offer_items ============
CREATE TABLE public.bundle_offer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid NOT NULL REFERENCES public.bundle_offers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  variant_scope public.bundle_variant_scope NOT NULL DEFAULT 'any',
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  is_anchor boolean NOT NULL DEFAULT false,
  is_complement_target boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bundle_offer_items_offer_idx ON public.bundle_offer_items(offer_id);
CREATE INDEX bundle_offer_items_product_idx ON public.bundle_offer_items(product_id);

GRANT SELECT ON public.bundle_offer_items TO anon, authenticated;
GRANT ALL ON public.bundle_offer_items TO service_role;

ALTER TABLE public.bundle_offer_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bundle_offer_items public read via active offer"
  ON public.bundle_offer_items FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bundle_offers o
      WHERE o.id = bundle_offer_items.offer_id
        AND o.is_active
        AND (o.starts_at IS NULL OR o.starts_at <= now())
        AND (o.ends_at IS NULL OR o.ends_at >= now())
    )
  );

CREATE POLICY "bundle_offer_items staff read all"
  ON public.bundle_offer_items FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "bundle_offer_items staff write"
  ON public.bundle_offer_items FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE TRIGGER trg_bundle_offer_items_updated
  BEFORE UPDATE ON public.bundle_offer_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
