ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS rating_avg numeric(3,2),
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_highlights text,
  ADD COLUMN IF NOT EXISTS review_highlights_count integer NOT NULL DEFAULT 0;

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating numeric(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5 AND rating * 2 = floor(rating * 2)),
  title text NOT NULL DEFAULT '',
  body text NOT NULL,
  display_name text NOT NULL,
  city text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hidden')),
  rejection_reason text,
  moderation_flags text[] NOT NULL DEFAULT '{}',
  admin_reply text,
  replied_at timestamptz,
  helpful_count integer NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  verified_purchase boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id)
);
CREATE INDEX product_reviews_product_status_idx ON public.product_reviews(product_id, status, created_at DESC);
CREATE INDEX product_reviews_status_idx ON public.product_reviews(status, created_at DESC);

CREATE TABLE public.product_review_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image','video')),
  storage_path text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_review_media_review_idx ON public.product_review_media(review_id);

CREATE TABLE public.product_review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.product_reviews(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, voter_key)
);

CREATE TABLE public.review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  sent_at timestamptz,
  reminder_sent_at timestamptz,
  completed_at timestamptz,
  clicked_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.review_dispatch_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_run_at timestamptz NOT NULL DEFAULT 'epoch'
);

GRANT SELECT ON public.product_reviews TO anon;
GRANT SELECT, UPDATE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
GRANT SELECT ON public.product_review_media TO anon;
GRANT SELECT, DELETE ON public.product_review_media TO authenticated;
GRANT ALL ON public.product_review_media TO service_role;
GRANT ALL ON public.product_review_votes TO service_role;
GRANT SELECT ON public.review_requests TO authenticated;
GRANT ALL ON public.review_requests TO service_role;
GRANT ALL ON public.review_dispatch_state TO service_role;

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_review_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_review_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_dispatch_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved reviews" ON public.product_reviews FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "Staff update reviews" ON public.product_reviews FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Public read review media" ON public.product_review_media FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.product_reviews r WHERE r.id = review_id
    AND (r.status = 'approved' OR r.user_id = auth.uid() OR public.is_staff(auth.uid()))));
CREATE POLICY "Staff delete review media" ON public.product_review_media FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff read review requests" ON public.review_requests FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.refresh_product_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products p SET
    rating_avg = s.avg, rating_count = s.cnt
  FROM (SELECT round(avg(rating)::numeric, 2) AS avg, count(*)::int AS cnt
        FROM public.product_reviews WHERE product_id = pid AND status = 'approved') s
  WHERE p.id = pid;
  IF TG_OP = 'UPDATE' AND OLD.product_id <> NEW.product_id THEN
    UPDATE public.products p SET rating_avg = s.avg, rating_count = s.cnt
    FROM (SELECT round(avg(rating)::numeric, 2) AS avg, count(*)::int AS cnt
          FROM public.product_reviews WHERE product_id = OLD.product_id AND status = 'approved') s
    WHERE p.id = OLD.product_id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER product_reviews_refresh_rating
AFTER INSERT OR UPDATE OF status, rating, product_id OR DELETE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_product_rating();

CREATE OR REPLACE FUNCTION public.touch_product_review()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER product_reviews_touch BEFORE UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.touch_product_review();

CREATE POLICY "Users upload own review media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Public read review media files" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'review-media');
CREATE POLICY "Staff delete review media files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'review-media' AND public.is_staff(auth.uid()));