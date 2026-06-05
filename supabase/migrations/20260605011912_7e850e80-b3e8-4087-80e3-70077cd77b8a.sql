
CREATE POLICY "produtos public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'produtos');
CREATE POLICY "produtos admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'produtos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "produtos admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'produtos' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "produtos admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'produtos' AND public.has_role(auth.uid(),'admin'));
