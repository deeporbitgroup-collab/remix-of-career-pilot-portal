-- Drop existing policies
DROP POLICY IF EXISTS "Students can upload their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own CV" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view CVs" ON storage.objects;
DROP POLICY IF EXISTS "Students can upload their own cover letters" ON storage.objects;
DROP POLICY IF EXISTS "Students can update their own cover letters" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view cover letters" ON storage.objects;

-- Allow public uploads to talent-pool-photos (students are not authenticated via Supabase Auth)
CREATE POLICY "Allow public photo uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'talent-pool-photos');

CREATE POLICY "Allow public photo updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'talent-pool-photos');

CREATE POLICY "Allow public photo deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'talent-pool-photos');

CREATE POLICY "Allow public photo reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'talent-pool-photos');

-- Allow public uploads to talent-pool-cv
CREATE POLICY "Allow public CV uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'talent-pool-cv');

CREATE POLICY "Allow public CV updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'talent-pool-cv');

CREATE POLICY "Allow public CV deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'talent-pool-cv');

CREATE POLICY "Allow public CV reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'talent-pool-cv');

-- Allow public uploads to talent-pool-covers
CREATE POLICY "Allow public cover uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'talent-pool-covers');

CREATE POLICY "Allow public cover updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'talent-pool-covers');

CREATE POLICY "Allow public cover deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'talent-pool-covers');

CREATE POLICY "Allow public cover reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'talent-pool-covers');