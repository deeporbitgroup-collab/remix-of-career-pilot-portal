-- Talent Pool: student flag "looking for a full-time job", toggled next to the
-- internship period in the student profile. Uses the existing column
-- student_profiles.full_employment_available.

CREATE OR REPLACE FUNCTION public.talent_pool_update_student_full_time(_user_id uuid, _full_time boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.student_profiles
  SET full_employment_available = COALESCE(_full_time, false),
      updated_at = now()
  WHERE user_id = _user_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.talent_pool_update_student_full_time(uuid, boolean) TO anon, authenticated, service_role;

-- Companies see the flag on the student cards: add full_employment_available to
-- the company-facing student list (return type changes, so drop + recreate).
DROP FUNCTION IF EXISTS public.talent_pool_get_students_for_company();

CREATE FUNCTION public.talent_pool_get_students_for_company()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  photo_url text,
  cv_url text,
  cover_letter_url text,
  linkedin_url text,
  presentation_video_url text,
  payment_status payment_status,
  access_status access_status,
  profile_visible_to_companies boolean,
  full_employment_available boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    sp.id,
    sp.user_id,
    sp.first_name,
    sp.last_name,
    sp.photo_url,
    sp.cv_url,
    sp.cover_letter_url,
    sp.linkedin_url,
    sp.presentation_video_url,
    sp.payment_status,
    sp.access_status,
    sp.profile_visible_to_companies,
    COALESCE(sp.full_employment_available, false)
  FROM public.student_profiles sp
  INNER JOIN public.talent_pool_users u ON u.id = sp.user_id
  WHERE u.role = 'STUDENT'::talent_pool_role
    AND u.registration_status = 'APPROVED'::registration_status
    AND u.status = 'active_member'::talent_pool_user_status
    AND sp.profile_visible_to_companies = true
    AND sp.access_status = 'UNLOCKED'::access_status
    AND sp.user_id IS NOT NULL
  ORDER BY sp.updated_at DESC NULLS LAST, sp.last_name, sp.first_name;
$$;

GRANT EXECUTE ON FUNCTION public.talent_pool_get_students_for_company() TO anon, authenticated, service_role;
