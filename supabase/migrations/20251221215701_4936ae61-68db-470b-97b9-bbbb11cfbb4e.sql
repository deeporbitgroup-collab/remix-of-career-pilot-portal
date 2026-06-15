-- Allow admins to manage any object in the profile-photos bucket
-- Fixes: "new row violates row-level security policy" when an ADMIN uploads a photo for another user

DROP POLICY IF EXISTS "Admins can upload profile photos" ON storage.objects;
CREATE POLICY "Admins can upload profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND public.is_admin()
);

DROP POLICY IF EXISTS "Admins can update profile photos" ON storage.objects;
CREATE POLICY "Admins can update profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND public.is_admin()
);

DROP POLICY IF EXISTS "Admins can delete profile photos" ON storage.objects;
CREATE POLICY "Admins can delete profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND public.is_admin()
);