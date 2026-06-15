-- Restrict companies visible to students to only APPROVED company users
CREATE OR REPLACE FUNCTION public.talent_pool_get_companies_for_student(_user_id uuid)
RETURNS SETOF company_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT cp.*
  FROM public.company_profiles cp
  JOIN public.talent_pool_users cu ON cu.id = cp.user_id AND cu.role = 'COMPANY'::talent_pool_role
  WHERE cu.registration_status = 'APPROVED'::registration_status
    AND EXISTS (
      SELECT 1
      FROM public.talent_pool_users u
      JOIN public.student_profiles sp ON sp.user_id = u.id
      WHERE u.id = _user_id
        AND u.role = 'STUDENT'::talent_pool_role
        AND u.registration_status = 'APPROVED'::registration_status
        AND sp.payment_status = 'VERIFIED'::payment_status
        AND sp.access_status = 'UNLOCKED'::access_status
    )
  ORDER BY cp.company_name;
$function$;