
-- ENUMs
DO $$ BEGIN CREATE TYPE public.customer_type AS ENUM ('pf','pj'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.address_kind AS ENUM ('shipping','billing','both'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.cart_status AS ENUM ('active','converted','abandoned'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.order_status AS ENUM ('draft','aguardando_pagamento','pago','em_preparacao','aguardando_arte','arte_aprovada','em_producao','enviado','entregue','cancelado','estornado'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_status AS ENUM ('pending','in_process','approved','authorized','rejected','refunded','cancelled','charged_back'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('pix','boleto','credit_card','debit_card','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.file_status AS ENUM ('enviado','em_analise','aprovado','rejeitado','correcao_solicitada'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.coupon_type AS ENUM ('percent','fixed','free_shipping'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- profiles extension
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS customer_type public.customer_type NOT NULL DEFAULT 'pf';
CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique ON public.profiles (cpf) WHERE cpf IS NOT NULL;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  state_registration TEXT,
  municipal_registration TEXT,
  phone TEXT,
  email TEXT,
  is_default BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS companies_user_idx ON public.companies(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS companies_user_cnpj_uniq ON public.companies(user_id, cnpj);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own companies" ON public.companies FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read companies" ON public.companies FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER companies_updated BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- customer_addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  label TEXT,
  recipient_name TEXT NOT NULL,
  recipient_document TEXT,
  zip TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  reference TEXT,
  kind public.address_kind NOT NULL DEFAULT 'both',
  is_default_shipping BOOLEAN NOT NULL DEFAULT false,
  is_default_billing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_addresses_user_idx ON public.customer_addresses(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.customer_addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read addresses" ON public.customer_addresses FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER customer_addresses_updated BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- logistics on catalog
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS length_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS insurance_value NUMERIC(12,2);
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10,3),
  ADD COLUMN IF NOT EXISTS length_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS width_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS insurance_value NUMERIC(12,2);

-- carts
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.cart_status NOT NULL DEFAULT 'active',
  coupon_code TEXT,
  currency TEXT NOT NULL DEFAULT 'BRL',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS carts_user_active_idx ON public.carts(user_id) WHERE status = 'active';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO authenticated;
GRANT ALL ON public.carts TO service_role;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own carts" ON public.carts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff read carts" ON public.carts FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER carts_updated BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- cart_items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cart_items_cart_idx ON public.cart_items(cart_id);
CREATE UNIQUE INDEX IF NOT EXISTS cart_items_unique_variant ON public.cart_items(cart_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart items" ON public.cart_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.carts c WHERE c.id = cart_id AND c.user_id = auth.uid()));
CREATE POLICY "staff read cart items" ON public.cart_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE TRIGGER cart_items_updated BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- order number
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START 1;
CREATE OR REPLACE FUNCTION public.next_order_number()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n BIGINT;
BEGIN
  n := nextval('public.order_number_seq');
  RETURN 'ADC-' || to_char(now(),'YYYY') || '-' || lpad(n::text, 6, '0');
END $$;

-- orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE DEFAULT public.next_order_number(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'draft',
  currency TEXT NOT NULL DEFAULT 'BRL',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  shipping_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  coupon_code TEXT,
  shipping_service TEXT,
  shipping_carrier TEXT,
  shipping_deadline_days INTEGER,
  shipping_quote_id UUID,
  payment_method public.payment_method,
  customer_notes TEXT,
  internal_notes TEXT,
  requires_art BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders(status);
CREATE INDEX IF NOT EXISTS orders_created_idx ON public.orders(created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own orders update draft" ON public.orders FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('draft','aguardando_pagamento'))
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "staff manage orders" ON public.orders FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  variant_label TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL,
  weight_kg NUMERIC(10,3),
  requires_art BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_items_order_idx ON public.order_items(order_id);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order items read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "own order items insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid() AND o.status IN ('draft','aguardando_pagamento')));
CREATE POLICY "staff manage order items" ON public.order_items FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- order_addresses
CREATE TABLE IF NOT EXISTS public.order_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  kind public.address_kind NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_document TEXT,
  zip TEXT NOT NULL,
  street TEXT NOT NULL,
  number TEXT NOT NULL,
  complement TEXT,
  district TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'BR',
  reference TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_addresses_order_idx ON public.order_addresses(order_id);
GRANT SELECT, INSERT ON public.order_addresses TO authenticated;
GRANT ALL ON public.order_addresses TO service_role;
ALTER TABLE public.order_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order addresses read" ON public.order_addresses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "own order addresses insert" ON public.order_addresses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "staff manage order addresses" ON public.order_addresses FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- order_status_history
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_status_history_order_idx ON public.order_status_history(order_id, created_at DESC);
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT ALL ON public.order_status_history TO service_role;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order history read" ON public.order_status_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "staff manage order history" ON public.order_status_history FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  external_id TEXT,
  preference_id TEXT,
  method public.payment_method,
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_order_idx ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_external_idx ON public.payments(provider, external_id);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own payments read" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "staff manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- payment_events
CREATE TABLE IF NOT EXISTS public.payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES public.payments(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'mercadopago',
  event_key TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, event_key)
);
CREATE INDEX IF NOT EXISTS payment_events_payment_idx ON public.payment_events(payment_id);
GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read payment events" ON public.payment_events FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

-- shipping_quotes
CREATE TABLE IF NOT EXISTS public.shipping_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cart_id UUID REFERENCES public.carts(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'melhorenvio',
  origin_zip TEXT NOT NULL,
  destination_zip TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  carrier TEXT NOT NULL,
  price NUMERIC(12,2) NOT NULL,
  deadline_days INTEGER NOT NULL,
  quote_token TEXT,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipping_quotes_cart_idx ON public.shipping_quotes(cart_id);
CREATE INDEX IF NOT EXISTS shipping_quotes_order_idx ON public.shipping_quotes(order_id);
GRANT SELECT, INSERT ON public.shipping_quotes TO authenticated;
GRANT ALL ON public.shipping_quotes TO service_role;
ALTER TABLE public.shipping_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quotes read" ON public.shipping_quotes FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "own quotes insert" ON public.shipping_quotes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "staff manage quotes" ON public.shipping_quotes FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- shipments
CREATE TABLE IF NOT EXISTS public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'melhorenvio',
  external_id TEXT,
  service TEXT,
  carrier TEXT,
  tracking_code TEXT,
  tracking_url TEXT,
  label_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  posted_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  raw JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS shipments_order_idx ON public.shipments(order_id);
GRANT SELECT ON public.shipments TO authenticated;
GRANT ALL ON public.shipments TO service_role;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shipments read" ON public.shipments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "staff manage shipments" ON public.shipments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER shipments_updated BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- order_files
CREATE TABLE IF NOT EXISTS public.order_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT,
  status public.file_status NOT NULL DEFAULT 'enviado',
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS order_files_order_idx ON public.order_files(order_id);
GRANT SELECT, INSERT, UPDATE ON public.order_files TO authenticated;
GRANT ALL ON public.order_files TO service_role;
ALTER TABLE public.order_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order files read" ON public.order_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "own order files insert" ON public.order_files FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()) AND uploaded_by = auth.uid());
CREATE POLICY "staff manage order files" ON public.order_files FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER order_files_updated BEFORE UPDATE ON public.order_files FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  type public.coupon_type NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "active coupons read" ON public.coupons FOR SELECT TO authenticated USING (is_active = true OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE TRIGGER coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- coupon_redemptions
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, order_id)
);
CREATE INDEX IF NOT EXISTS coupon_redemptions_user_idx ON public.coupon_redemptions(user_id);
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own redemptions read" ON public.coupon_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "staff manage redemptions" ON public.coupon_redemptions FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

-- integration_logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  request JSONB,
  response JSONB,
  status_code INTEGER,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS integration_logs_order_idx ON public.integration_logs(order_id);
CREATE INDEX IF NOT EXISTS integration_logs_provider_idx ON public.integration_logs(provider, created_at DESC);
GRANT SELECT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read integration logs" ON public.integration_logs FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
