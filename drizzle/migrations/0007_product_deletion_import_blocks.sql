CREATE TABLE public.product_import_blocks (
  identity_kind text NOT NULL,
  identity_value text NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  deleted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (identity_kind, identity_value)
);
GRANT SELECT ON public.product_import_blocks TO authenticated;
GRANT ALL ON public.product_import_blocks TO service_role;
ALTER TABLE public.product_import_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_read_import_blocks ON public.product_import_blocks FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE FUNCTION public.product_import_identities(p public.products)
RETURNS TABLE(identity_kind text, identity_value text)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT kind, value FROM (VALUES
    ('id', p.id::text),
    ('sku', lower(nullif(btrim(p.sku), ''))),
    ('slug', lower(nullif(btrim(p.slug), ''))),
    ('old_url', nullif(rtrim(btrim(p.old_url), '/'), '')),
    ('legacy_id', CASE WHEN p.legacy_id IS NOT NULL THEN coalesce(p.legacy_store_id::text, '') || ':' || p.legacy_id::text END)
  ) AS identifiers(kind, value) WHERE value IS NOT NULL;
$$;

CREATE FUNCTION public.remember_deleted_product()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.order_items WHERE product_id = OLD.id) THEN
    RAISE EXCEPTION 'Este produto já faz parte de pedidos. Use Ocultar ou Descontinuar.';
  END IF;
  INSERT INTO public.product_import_blocks(identity_kind, identity_value, product_id, product_name, deleted_by)
    SELECT identity_kind, identity_value, OLD.id, OLD.name, auth.uid()
    FROM public.product_import_identities(OLD)
    ON CONFLICT DO NOTHING;
  INSERT INTO public.product_import_blocks(identity_kind, identity_value, product_id, product_name, deleted_by)
    SELECT DISTINCT 'sku', lower(btrim(sku)), OLD.id, OLD.name, auth.uid()
    FROM public.product_variants WHERE product_id = OLD.id AND nullif(btrim(sku), '') IS NOT NULL
    ON CONFLICT DO NOTHING;
  DELETE FROM public.cart_items WHERE product_id = OLD.id;
  DELETE FROM public.bundle_offer_items WHERE product_id = OLD.id;
  RETURN OLD;
END;
$$;
CREATE TRIGGER remember_deleted_product BEFORE DELETE ON public.products FOR EACH ROW EXECUTE FUNCTION public.remember_deleted_product();

CREATE FUNCTION public.prevent_blocked_product_import()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.product_import_identities(NEW) i
    JOIN public.product_import_blocks b USING (identity_kind, identity_value)
  ) THEN
    RAISE EXCEPTION 'Produto excluído: não importar novamente.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER prevent_blocked_product_import BEFORE INSERT OR UPDATE OF id, sku, slug, old_url, legacy_id, legacy_store_id ON public.products FOR EACH ROW EXECUTE FUNCTION public.prevent_blocked_product_import();

CREATE FUNCTION public.delete_selected_products(product_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item_id uuid;
  item_name text;
  deleted_ids uuid[] := '{}';
  failures jsonb := '[]';
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;
  IF cardinality(product_ids) IS NULL OR cardinality(product_ids) < 1 OR cardinality(product_ids) > 500 THEN
    RAISE EXCEPTION 'Selecione entre 1 e 500 produtos.';
  END IF;
  FOR item_id IN SELECT DISTINCT unnest(product_ids) LOOP
    item_name := NULL;
    BEGIN
      SELECT name INTO item_name FROM public.products WHERE id = item_id FOR UPDATE;
      IF NOT FOUND THEN
        failures := failures || jsonb_build_array(jsonb_build_object('id', item_id, 'name', '', 'reason', 'Produto não encontrado.'));
        CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM public.order_items WHERE product_id = item_id) THEN
        failures := failures || jsonb_build_array(jsonb_build_object('id', item_id, 'name', item_name, 'reason', 'Produto vinculado a pedidos. Use Ocultar ou Descontinuar.'));
        CONTINUE;
      END IF;
      DELETE FROM public.products WHERE id = item_id;
      deleted_ids := array_append(deleted_ids, item_id);
    EXCEPTION WHEN foreign_key_violation THEN
      failures := failures || jsonb_build_array(jsonb_build_object('id', item_id, 'name', item_name, 'reason', 'Produto possui vínculos que impedem a exclusão.'));
    WHEN OTHERS THEN
      failures := failures || jsonb_build_array(jsonb_build_object('id', item_id, 'name', item_name, 'reason', 'Não foi possível excluir este produto.'));
    END;
  END LOOP;
  RETURN jsonb_build_object('deletedIds', to_jsonb(deleted_ids), 'failures', failures);
END;
$$;
REVOKE ALL ON FUNCTION public.product_import_identities(public.products) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.remember_deleted_product() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_blocked_product_import() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_selected_products(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_selected_products(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.product_import_identities(public.products) TO service_role;
