DROP POLICY "public read active categories" ON public.solution_categories;
DROP POLICY "public read published journeys" ON public.solution_journeys;
DROP POLICY "public read steps" ON public.solution_steps;
DROP POLICY "public read recs" ON public.solution_recommendations;
CREATE POLICY "public read active categories" ON public.solution_categories FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "public read published journeys" ON public.solution_journeys FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "public read steps" ON public.solution_steps FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.solution_journeys j WHERE j.id = journey_id AND j.status = 'published'));
CREATE POLICY "public read recs" ON public.solution_recommendations FOR SELECT TO anon, authenticated USING (is_active AND EXISTS (SELECT 1 FROM public.solution_steps s JOIN public.solution_journeys j ON j.id = s.journey_id WHERE s.id = step_id AND j.status = 'published'));