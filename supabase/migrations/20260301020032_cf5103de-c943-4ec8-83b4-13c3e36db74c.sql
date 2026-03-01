
-- Add cover_url column to course_modules
ALTER TABLE public.course_modules ADD COLUMN IF NOT EXISTS cover_url text;

-- Create storage bucket for module covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('module-covers', 'module-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view module covers
CREATE POLICY "Anyone can view module covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'module-covers');

-- Allow admins to upload module covers
CREATE POLICY "Admins can upload module covers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'module-covers' AND (SELECT is_admin(auth.uid())));

-- Allow admins to update module covers
CREATE POLICY "Admins can update module covers"
ON storage.objects FOR UPDATE
USING (bucket_id = 'module-covers' AND (SELECT is_admin(auth.uid())));

-- Allow admins to delete module covers
CREATE POLICY "Admins can delete module covers"
ON storage.objects FOR DELETE
USING (bucket_id = 'module-covers' AND (SELECT is_admin(auth.uid())));
