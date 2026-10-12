CREATE TABLE public.email_template_settings (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  subject text,
  heading text,
  intro text,
  body text,
  cta_label text,
  closing text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_template_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_template_settings TO authenticated;
GRANT ALL ON public.email_template_settings TO service_role;
CREATE POLICY "staff manage email settings" ON public.email_template_settings FOR ALL TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE TABLE public.app_email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL,
  recipient text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','suppressed','failed','disabled')),
  error_message text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX app_email_log_created_idx ON public.app_email_log (created_at DESC);
ALTER TABLE public.app_email_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.app_email_log TO authenticated;
GRANT ALL ON public.app_email_log TO service_role;
CREATE POLICY "staff read email log" ON public.app_email_log FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.newsletter_subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text,
  source text,
  consent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
GRANT SELECT, DELETE ON public.newsletter_subscribers TO authenticated;
GRANT ALL ON public.newsletter_subscribers TO service_role;
CREATE POLICY "staff read newsletter" ON public.newsletter_subscribers FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff delete newsletter" ON public.newsletter_subscribers FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company text,
  email text NOT NULL,
  phone text,
  segment text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.contact_submissions TO authenticated;
GRANT ALL ON public.contact_submissions TO service_role;
CREATE POLICY "staff read contacts" ON public.contact_submissions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));