-- Allow public uploads to client-cvs folder in documents bucket
CREATE POLICY "Allow client CV uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'documents' AND (storage.foldername(name))[1] = 'client-cvs'
);

-- Allow reading client CVs
CREATE POLICY "Allow reading client CVs"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'documents' AND (storage.foldername(name))[1] = 'client-cvs'
);