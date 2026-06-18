-- Companies see only admin-approved, active students explicitly visible in the pool.
CREATE OR REPLACE FUNCTION public.talent_pool_get_students_for_company()
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
  profile_visible_to_companies boolean
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
    sp.profile_visible_to_companies
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
