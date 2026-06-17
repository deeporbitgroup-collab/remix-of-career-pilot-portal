-- Extend admin_get_companies to ALSO return the company description.
--
-- The admin company editor reuses update_company_profile, which OVERWRITES every
-- field. So the admin form must pre-fill ALL current values (including description)
-- to avoid blanking fields when the admin edits just one. admin_get_companies did
-- not return description, so we add it here. Pure read function, SECURITY DEFINER.
DROP FUNCTION IF EXISTS public.admin_get_companies();

CREATE OR REPLACE FUNCTION public.admin_get_companies()
 RETURNS TABLE(
   id uuid,
   email text,
   role talent_pool_role,
   status talent_pool_user_status,
   registration_status registration_status,
   created_at timestamp with time zone,
   updated_at timestamp with time zone,
   profile_id uuid,
   company_name text,
   sector text,
   size company_size,
   reference_email text,
   linkedin_url text,
   logo_url text,
   description text
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    tpu.id,
    tpu.email,
    tpu.role,
    tpu.status,
    tpu.registration_status,
    tpu.created_at,
    tpu.updated_at,
    cp.id as profile_id,
    cp.company_name,
    cp.sector,
    cp.size,
    cp.reference_email,
    cp.linkedin_url,
    cp.logo_url,
    cp.description
  FROM public.talent_pool_users tpu
  LEFT JOIN public.company_profiles cp ON tpu.id = cp.user_id
  WHERE tpu.role = 'COMPANY'::talent_pool_role
  ORDER BY tpu.created_at DESC;
$function$;
