CREATE TABLE public.staff_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  can_export_customers boolean NOT NULL DEFAULT false,
  can_export_orders boolean NOT NULL DEFAULT false,
  can_export_products boolean NOT NULL DEFAULT true,
  sections text[] NOT NULL DEFAULT ARRAY['dashboard','pedidos','clientes','artes','produtos']::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.staff_permissions TO authenticated;
GRANT ALL ON public.staff_permissions TO service_role;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own or admin read staff perms" ON public.staff_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER staff_permissions_updated BEFORE UPDATE ON public.staff_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();