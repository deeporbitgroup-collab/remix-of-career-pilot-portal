-- Drop existing policies that rely on auth.uid() (students don't use Supabase Auth)
DROP POLICY IF EXISTS "Students can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view all pathways receipts" ON storage.objects;

-- Allow anyone to upload to pathways-receipts (students use custom auth, not Supabase Auth)
CREATE POLICY "Allow uploads to pathways-receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pathways-receipts'
);

-- Allow anyone to view files in pathways-receipts
CREATE POLICY "Allow viewing pathways-receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'pathways-receipts'
);