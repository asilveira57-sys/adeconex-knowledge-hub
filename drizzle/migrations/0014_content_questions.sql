ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_preset text;

CREATE TABLE public.content_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('product','download','tool')),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  download_id uuid REFERENCES public.downloads(id) ON DELETE CASCADE,
  tool_path text,
  question text NOT NULL CHECK (char_length(question) BETWEEN 10 AND 1000),
  answer text CHECK (answer IS NULL OR char_length(answer) <= 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','answered','published','cancelled')),
  identity_consent boolean NOT NULL DEFAULT false,
  identity_consent_at timestamptz,
  answered_by uuid,
  answered_at timestamptz,
  published_by uuid,
  published_at timestamptz,
  cancel_reason text,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_questions_target CHECK (
    (content_type = 'product' AND product_id IS NOT NULL AND download_id IS NULL AND tool_path IS NULL) OR
    (content_type = 'download' AND download_id IS NOT NULL AND product_id IS NULL AND tool_path IS NULL) OR
    (content_type = 'tool' AND tool_path IS NOT NULL AND product_id IS NULL AND download_id IS NULL)
  )
);
CREATE INDEX content_questions_product_pub ON public.content_questions (product_id, published_at DESC) WHERE status = 'published';
CREATE INDEX content_questions_download_pub ON public.content_questions (download_id, published_at DESC) WHERE status = 'published';
CREATE INDEX content_questions_tool_pub ON public.content_questions (tool_path, published_at DESC) WHERE status = 'published';
CREATE INDEX content_questions_status ON public.content_questions (status, created_at DESC);
CREATE INDEX content_questions_user ON public.content_questions (user_id, created_at DESC);

CREATE TABLE public.content_question_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.content_questions(id) ON DELETE CASCADE,
  actor_id uuid,
  action text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX content_question_events_q ON public.content_question_events (question_id, created_at);

GRANT SELECT ON public.content_questions TO authenticated;
GRANT ALL ON public.content_questions TO service_role;
GRANT SELECT ON public.content_question_events TO authenticated;
GRANT ALL ON public.content_question_events TO service_role;

ALTER TABLE public.content_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_question_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or staff read questions" ON public.content_questions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid()));
CREATE POLICY "Staff read question events" ON public.content_question_events FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE TRIGGER content_questions_updated_at BEFORE UPDATE ON public.content_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();