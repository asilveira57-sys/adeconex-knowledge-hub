DROP POLICY "Public reads published downloads" ON public.downloads;
CREATE POLICY "Anon reads published downloads" ON public.downloads FOR SELECT TO anon USING (is_published);
CREATE POLICY "Users read published or staff all downloads" ON public.downloads FOR SELECT TO authenticated USING (is_published OR public.is_staff(auth.uid()));