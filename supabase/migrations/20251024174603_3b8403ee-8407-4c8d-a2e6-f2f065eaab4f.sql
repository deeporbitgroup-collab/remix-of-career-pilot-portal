-- Create storage policies for Pathways users to upload profile photos
CREATE POLICY "Pathways users can upload their own profile photo"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'talent-pool-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Pathways users can update their own profile photo"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'talent-pool-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'talent-pool-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view profile photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'talent-pool-photos');