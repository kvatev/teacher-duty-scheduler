
-- Create storage bucket for school logos
INSERT INTO storage.buckets (id, name, public) VALUES ('school-assets', 'school-assets', true);

-- Allow anyone to view files in school-assets bucket
CREATE POLICY "Public read access on school-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-assets');

-- Allow anyone to upload (admin check is done in app)
CREATE POLICY "Allow uploads to school-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-assets');

-- Allow anyone to update
CREATE POLICY "Allow updates to school-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school-assets');

-- Allow anyone to delete
CREATE POLICY "Allow deletes on school-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'school-assets');
