-- Regression fix: admin_get_students() lost the talent_pool_users.status column
-- in migration 20260618160000_student_bureaucracy.sql. The Admin dashboard gates
-- the Admit/Reject actions on student.status === 'pending_review', so without it
-- pending students (e.g. just-registered ones) show up but cannot be admitted/
-- made visible to companies. Re-add status to the function's return.

DROP FUNCTION IF EXISTS public.admin_get_students();

CREATE OR REPLACE FUNCTION public.admin_get_students()
 RETURNS TABLE(
   id uuid,
   email text,
   role talent_pool_role,
   status talent_pool_user_status,
   registration_status registration_status,
   created_at timestamp with time zone,
   updated_at timestamp with time zone,
   profile_id uuid,
   first_name text,
   last_name text,
   phone text,
   linkedin_url text,
   cv_url text,
   cover_letter_url text,
   photo_url text,
   payment_status payment_status,
   access_status access_status,
   payment_reference text,
   monthly_payment_active boolean,
   monthly_payment_start_date timestamp with time zone,
   profile_visible_to_companies boolean,
   passport_url text,
   uk_work_visa text,
   internship_start_date date,
   internship_end_date date,
   home_address text,
   city text,
   country text,
   citizenship text
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
    sp.id as profile_id,
    sp.first_name,
    sp.last_name,
    sp.phone,
    sp.linkedin_url,
    sp.cv_url,
    sp.cover_letter_url,
    sp.photo_url,
    sp.payment_status,
    sp.access_status,
    sp.payment_reference,
    sp.monthly_payment_active,
    sp.monthly_payment_start_date,
    sp.profile_visible_to_companies,
    sp.passport_url,
    sp.uk_work_visa,
    sp.internship_start_date,
    sp.internship_end_date,
    sp.home_address,
    sp.city,
    sp.country,
    sp.citizenship
  FROM public.talent_pool_users tpu
  LEFT JOIN public.student_profiles sp ON tpu.id = sp.user_id
  WHERE tpu.role = 'STUDENT'::talent_pool_role
  ORDER BY tpu.created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.admin_get_students() TO anon, authenticated, service_role;
