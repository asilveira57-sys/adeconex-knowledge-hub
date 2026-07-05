-- Fila de mídia: linhas com source_url mas sem storage_path
CREATE INDEX IF NOT EXISTS images_pending_migration_idx
  ON public.product_images (product_id)
  WHERE storage_path IS NULL AND source_url IS NOT NULL;

-- Produtos por status (o hot path é 'imported' e 'published')
CREATE INDEX IF NOT EXISTS products_status_updated_idx
  ON public.products (status, updated_at DESC);

-- Produto sem imagem / sem preço (jsonb contains)
CREATE INDEX IF NOT EXISTS products_quality_flags_gin_idx
  ON public.products USING gin (quality_flags jsonb_path_ops);

-- Imagem principal por produto (para o listProducts)
CREATE INDEX IF NOT EXISTS images_main_by_product_idx
  ON public.product_images (product_id)
  WHERE is_main = true;