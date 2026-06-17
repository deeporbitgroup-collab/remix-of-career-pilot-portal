-- Talent Pool: let a student edit their LinkedIn URL after registration.
--
-- There is no profile UPDATE path for linkedin_url today, and the permissive
-- student_profiles UPDATE policy was intentionally removed ("drop the insecure
-- policy"). So, exactly like talent_pool_update_student_photo / _documents /
-- _video, this is a small SECURITY DEFINER RPC the student can call (no auth.uid()).
-- Empty input clears the field (stored as NULL).
CREATE OR REPLACE FUNCTION public.talent_pool_update_student_linkedin(
  _user_id uuid,
  _linkedin_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.student_profiles
  SET linkedin_url = NULLIF(btrim(_linkedin_url), ''),
      updated_at = NOW()
  WHERE user_id = _user_id;
END;
$function$;
