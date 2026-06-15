-- Drop the policies that require authentication for Pathways users
DROP POLICY IF EXISTS "Pathways users can upload their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Pathways users can update their own profile photo" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;

-- Create policies that allow uploads without Supabase Auth (for Pathways custom auth)
CREATE POLICY "Allow profile photo uploads in talent-pool-photos"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'talent-pool-photos');

CREATE POLICY "Allow profile photo updates in talent-pool-photos"
ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'talent-pool-photos')
WITH CHECK (bucket_id = 'talent-pool-photos');

CREATE POLICY "Allow viewing photos in talent-pool-photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'talent-pool-photos');

CREATE POLICY "Allow deleting photos in talent-pool-photos"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'talent-pool-photos');