
-- 1) Expand coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS max_discount_per_order numeric(12,2),
  ADD COLUMN IF NOT EXISTS max_total_discount numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_discount_used numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS applies_to_all_customers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS applies_to_all_categories boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS applies_to_all_products boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS stack_with_promotions boolean NOT NULL DEFAULT true;

-- Case-insensitive unique on code
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_lower_idx ON public.coupons (lower(code));

-- 2) Expand coupon_redemptions
ALTER TABLE public.coupon_redemptions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmado',
  ADD COLUMN IF NOT EXISTS original_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS eligible_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS final_total numeric(12,2);

CREATE INDEX IF NOT EXISTS coupon_redemptions_status_idx ON public.coupon_redemptions(status);
CREATE INDEX IF NOT EXISTS coupon_redemptions_coupon_status_idx ON public.coupon_redemptions(coupon_id, status);

-- 3) Link tables
CREATE TABLE IF NOT EXISTS public.coupon_customers (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_customers TO authenticated;
GRANT ALL ON public.coupon_customers TO service_role;
ALTER TABLE public.coupon_customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon_customers staff manage" ON public.coupon_customers
  TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "coupon_customers own read" ON public.coupon_customers
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));

CREATE TABLE IF NOT EXISTS public.coupon_categories (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'include' CHECK (mode IN ('include','exclude')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, category_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_categories TO authenticated;
GRANT ALL ON public.coupon_categories TO service_role;
ALTER TABLE public.coupon_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon_categories staff manage" ON public.coupon_categories
  TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "coupon_categories read auth" ON public.coupon_categories
  FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.coupon_products (
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'include' CHECK (mode IN ('include','exclude')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coupon_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_products TO authenticated;
GRANT ALL ON public.coupon_products TO service_role;
ALTER TABLE public.coupon_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupon_products staff manage" ON public.coupon_products
  TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "coupon_products read auth" ON public.coupon_products
  FOR SELECT TO authenticated USING (true);

-- 4) Redeem / refund functions (transactional, row-lock coupon)
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  _coupon_code text,
  _order_id uuid,
  _user_id uuid,
  _original_total numeric,
  _eligible_total numeric,
  _discount numeric,
  _final_total numeric
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon public.coupons%ROWTYPE;
  v_uses_total int;
  v_uses_user int;
  v_redemption_id uuid;
BEGIN
  SELECT * INTO v_coupon FROM public.coupons
    WHERE lower(code) = lower(_coupon_code)
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'coupon_not_found'; END IF;
  IF NOT v_coupon.is_active THEN RAISE EXCEPTION 'coupon_inactive'; END IF;
  IF v_coupon.starts_at IS NOT NULL AND now() < v_coupon.starts_at THEN RAISE EXCEPTION 'coupon_not_started'; END IF;
  IF v_coupon.expires_at IS NOT NULL AND now() > v_coupon.expires_at THEN RAISE EXCEPTION 'coupon_expired'; END IF;

  IF v_coupon.max_uses IS NOT NULL THEN
    SELECT count(*) INTO v_uses_total FROM public.coupon_redemptions
      WHERE coupon_id = v_coupon.id AND status IN ('reservado','confirmado');
    IF v_uses_total >= v_coupon.max_uses THEN RAISE EXCEPTION 'coupon_exhausted'; END IF;
  END IF;

  IF v_coupon.max_uses_per_user IS NOT NULL THEN
    SELECT count(*) INTO v_uses_user FROM public.coupon_redemptions
      WHERE coupon_id = v_coupon.id AND user_id = _user_id AND status IN ('reservado','confirmado');
    IF v_uses_user >= v_coupon.max_uses_per_user THEN RAISE EXCEPTION 'coupon_user_limit'; END IF;
  END IF;

  IF v_coupon.max_total_discount IS NOT NULL
     AND (v_coupon.total_discount_used + _discount) > v_coupon.max_total_discount THEN
    RAISE EXCEPTION 'coupon_total_cap';
  END IF;

  INSERT INTO public.coupon_redemptions(
    coupon_id, order_id, user_id, amount, status, original_total, eligible_total, final_total
  ) VALUES (
    v_coupon.id, _order_id, _user_id, _discount, 'confirmado', _original_total, _eligible_total, _final_total
  ) RETURNING id INTO v_redemption_id;

  UPDATE public.coupons
    SET total_discount_used = total_discount_used + _discount
    WHERE id = v_coupon.id;

  RETURN v_redemption_id;
END $$;

REVOKE ALL ON FUNCTION public.redeem_coupon(text,uuid,uuid,numeric,numeric,numeric,numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text,uuid,uuid,numeric,numeric,numeric,numeric) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refund_coupon(_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.coupon_redemptions%ROWTYPE;
BEGIN
  FOR r IN SELECT * FROM public.coupon_redemptions
           WHERE order_id = _order_id AND status = 'confirmado' FOR UPDATE
  LOOP
    UPDATE public.coupon_redemptions SET status = 'cancelado' WHERE id = r.id;
    UPDATE public.coupons
      SET total_discount_used = GREATEST(0, total_discount_used - r.amount)
      WHERE id = r.coupon_id;
  END LOOP;
END $$;

REVOKE ALL ON FUNCTION public.refund_coupon(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.refund_coupon(uuid) TO authenticated, service_role;
