-- Create a public bucket for associate overviews
INSERT INTO storage.buckets (id, name, public)
VALUES ('associate-overviews', 'associate-overviews', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to view overview files (public bucket)
CREATE POLICY "Anyone can view associate overviews"
ON storage.objects FOR SELECT
USING (bucket_id = 'associate-overviews');

-- Allow authenticated users to upload/update their own overviews
CREATE POLICY "Authenticated users can upload overviews"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'associate-overviews');

CREATE POLICY "Authenticated users can update overviews"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'associate-overviews');

CREATE POLICY "Authenticated users can delete overviews"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'associate-overviews');