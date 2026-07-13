
DROP POLICY IF EXISTS "order files owner read" ON storage.objects;
CREATE POLICY "order files owner read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-files'
    AND (
      public.is_staff(auth.uid())
      OR auth.uid()::text = (storage.foldername(name))[1]
    )
  );

DROP POLICY IF EXISTS "order files owner insert" ON storage.objects;
CREATE POLICY "order files owner insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-files'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "order files staff manage" ON storage.objects;
CREATE POLICY "order files staff manage" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'order-files' AND public.is_staff(auth.uid()))
  WITH CHECK (bucket_id = 'order-files' AND public.is_staff(auth.uid()));
