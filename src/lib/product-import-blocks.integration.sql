-- Transactional regression: all fixtures and tombstones are rolled back.
BEGIN;
DO $$
DECLARE
  fixture_id uuid := gen_random_uuid();
  sold_id uuid;
  blocked boolean;
  candidate jsonb;
BEGIN
  INSERT INTO public.products(id, name, slug, sku, legacy_id, legacy_store_id, old_url, status)
  VALUES (fixture_id, 'Import block regression', 'regression-import-block', 'REGRESSION-BLOCK-SKU', 99991234, 991, 'https://example.test/regression-product', 'hidden');
  DELETE FROM public.products WHERE id = fixture_id;
  IF (SELECT count(*) FROM public.product_import_blocks WHERE product_id = fixture_id) <> 5 THEN
    RAISE EXCEPTION 'Deleted product identities were not retained';
  END IF;
  FOR candidate IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
    jsonb_build_object('id', fixture_id),
    jsonb_build_object('sku', ' regression-block-sku '),
    jsonb_build_object('slug', 'regression-import-block'),
    jsonb_build_object('legacy_id', 99991234, 'legacy_store_id', 991),
    jsonb_build_object('old_url', 'https://example.test/regression-product/')
  )) LOOP
    blocked := false;
    BEGIN
      INSERT INTO public.products(id, name, slug, sku, legacy_id, legacy_store_id, old_url, status)
      VALUES (coalesce((candidate->>'id')::uuid, gen_random_uuid()), 'Reimport test',
        coalesce(candidate->>'slug', 'regression-new-' || gen_random_uuid()::text),
        candidate->>'sku', (candidate->>'legacy_id')::integer, (candidate->>'legacy_store_id')::integer,
        candidate->>'old_url', 'hidden');
    EXCEPTION WHEN check_violation THEN
      blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'Reimport identity not blocked: %', candidate; END IF;
  END LOOP;
  SELECT product_id INTO sold_id FROM public.order_items LIMIT 1;
  IF sold_id IS NOT NULL THEN
    blocked := false;
    BEGIN
      DELETE FROM public.products WHERE id = sold_id;
    EXCEPTION WHEN raise_exception THEN blocked := true;
    END;
    IF NOT blocked THEN RAISE EXCEPTION 'Sold product was not protected'; END IF;
    IF EXISTS (SELECT 1 FROM public.product_import_blocks WHERE product_id = sold_id) THEN
      RAISE EXCEPTION 'Failed deletion created an import block';
    END IF;
  END IF;
END;
$$;
ROLLBACK;