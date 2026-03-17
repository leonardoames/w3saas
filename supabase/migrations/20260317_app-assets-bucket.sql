-- Storage bucket for app-level assets (logo, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-assets', 'app-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view app assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'app-assets');

CREATE POLICY "Admins can upload app assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'app-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update app assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'app-assets' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete app assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'app-assets' AND public.is_admin(auth.uid()));
