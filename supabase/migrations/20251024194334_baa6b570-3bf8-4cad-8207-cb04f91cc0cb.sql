-- Fix the talent_pool_update_student_documents function to not overwrite existing documents with NULL
DROP FUNCTION IF EXISTS public.talent_pool_update_student_documents(uuid, text, text);

CREATE OR REPLACE FUNCTION public.talent_pool_update_student_documents(_user_id uuid, _cv_url text, _cover_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only update the fields that are not NULL
  UPDATE public.student_profiles
  SET cv_url = COALESCE(_cv_url, cv_url),
      cover_letter_url = COALESCE(_cover_url, cover_letter_url),
      updated_at = now()
  WHERE user_id = _user_id;
END;
$$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view CVs" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload their own cover letters" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own cover letters" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view cover letters" ON storage.objects;

-- Ensure storage policies for talent-pool-photos bucket
CREATE POLICY "Students can upload their own photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'talent-pool-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can update their own photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'talent-pool-photos' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'talent-pool-photos');

-- Ensure storage policies for talent-pool-cv bucket
CREATE POLICY "Students can upload their own CV"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'talent-pool-cv' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can update their own CV"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'talent-pool-cv' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view CVs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'talent-pool-cv');

-- Ensure storage policies for talent-pool-covers bucket
CREATE POLICY "Students can upload their own cover letters"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'talent-pool-covers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can update their own cover letters"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'talent-pool-covers' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view cover letters"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'talent-pool-covers');