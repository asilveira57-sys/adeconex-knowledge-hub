-- Restrict coupon rule data to staff only
DROP POLICY IF EXISTS "coupon_categories read auth" ON public.coupon_categories;
CREATE POLICY "coupon_categories staff read" ON public.coupon_categories
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "coupon_products read auth" ON public.coupon_products;
CREATE POLICY "coupon_products staff read" ON public.coupon_products
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "active coupons read" ON public.coupons;
CREATE POLICY "coupons staff read" ON public.coupons
  FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- Coupon mutation functions must not be callable directly by clients
REVOKE ALL ON FUNCTION public.redeem_coupon(text, uuid, uuid, numeric, numeric, numeric, numeric) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.refund_coupon(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(text, uuid, uuid, numeric, numeric, numeric, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_coupon(uuid) TO service_role;

-- has_role / is_staff are only needed by policies and server code, not anon
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM anon, public;