-- Talent Pool: presentation video storage + save RPC.
--
-- The video feature was wired in the UI (student_profiles.presentation_video_url
-- column + the StudentDashboard upload code) but the storage BUCKET and the save
-- RPC were never created — so uploads currently fail with "Bucket not found".
-- This migration creates both, mirroring the SAME permissive policy pattern used
-- for talent-pool-cv / talent-pool-covers (Talent Pool students are NOT Supabase-
-- authenticated, so storage policies gate by bucket_id only — same as the other TP
-- buckets). This avoids the "missing RLS policy" bug that broke client-photos.

-- 1) Bucket: public read (companies/admin read via public URL, like cv/covers),
--    50 MB limit (the free-plan global Storage limit), MP4/MOV only.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'talent-pool-videos',
  'talent-pool-videos',
  true,
  52428800, -- 50 MB
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) Storage RLS policies — public insert/update/delete/select by bucket_id,
--    exactly like talent-pool-cv / talent-pool-covers.
DROP POLICY IF EXISTS "Allow public video uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public video updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public video deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow public video reads" ON storage.objects;

CREATE POLICY "Allow public video uploads"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'talent-pool-videos');

CREATE POLICY "Allow public video updates"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'talent-pool-videos');

CREATE POLICY "Allow public video deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'talent-pool-videos');

CREATE POLICY "Allow public video reads"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'talent-pool-videos');

-- 3) Save RPC (SECURITY DEFINER, mirrors talent_pool_update_student_documents) so
--    the student (no auth.uid()) can persist/clear their video URL safely.
CREATE OR REPLACE FUNCTION public.talent_pool_update_student_video(
  _user_id uuid,
  _video_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.student_profiles
  SET presentation_video_url = _video_url,
      updated_at = NOW()
  WHERE user_id = _user_id;
END;
$function$;
