-- Create pathways-receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('pathways-receipts', 'pathways-receipts', false);

-- Allow students to upload their own receipts
CREATE POLICY "Students can upload their own receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'pathways-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow students to view their own receipts
CREATE POLICY "Students can view their own receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'pathways-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admin to view all receipts
CREATE POLICY "Admin can view all pathways receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'pathways-receipts'
  AND EXISTS (
    SELECT 1 FROM pathways_users
    WHERE id = auth.uid()
    AND role = 'ADMIN'
  )
);