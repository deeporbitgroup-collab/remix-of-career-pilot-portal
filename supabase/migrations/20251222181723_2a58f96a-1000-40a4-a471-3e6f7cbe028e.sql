-- Create storage policy to allow client users to upload receipts
-- The documents bucket already exists, we just need to add policies for client uploads

-- Allow anyone to upload client receipts (since client_users uses custom auth, not Supabase auth)
CREATE POLICY "Allow client receipt uploads"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'client-receipts');

-- Allow reading client receipts
CREATE POLICY "Allow reading client receipts"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'client-receipts');