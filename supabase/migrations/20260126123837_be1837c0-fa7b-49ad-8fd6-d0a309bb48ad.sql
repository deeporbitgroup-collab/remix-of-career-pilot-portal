-- Add storage policy for outreach documents uploads
CREATE POLICY "Allow public upload to outreach-documents folder"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'outreach-documents');

-- Allow public read for outreach documents
CREATE POLICY "Allow public read from outreach-documents folder"
ON storage.objects
FOR SELECT
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = 'outreach-documents');