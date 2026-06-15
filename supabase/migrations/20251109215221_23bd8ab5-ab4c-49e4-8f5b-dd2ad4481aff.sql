-- Fix RLS policies for partner-documents bucket to allow logo uploads and reading

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Partners can manage their documents" ON storage.objects;
DROP POLICY IF EXISTS "Partners can view their documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all partner documents" ON storage.objects;

-- Create new comprehensive policies for partner-documents bucket

-- Allow partners to upload their own files (including logos)
CREATE POLICY "Partners can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'partner-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow partners to update their own files
CREATE POLICY "Partners can update their own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'partner-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow partners to delete their own files
CREATE POLICY "Partners can delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'partner-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow partners to read/select their own files
CREATE POLICY "Partners can view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'partner-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow admins to manage all partner documents
CREATE POLICY "Admins can manage all partner documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'partner-documents' 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
    AND status = 'approved'
  )
);

-- Make sure bucket exists and is configured correctly
INSERT INTO storage.buckets (id, name, public)
VALUES ('partner-documents', 'partner-documents', true)
ON CONFLICT (id) DO UPDATE
SET public = true;