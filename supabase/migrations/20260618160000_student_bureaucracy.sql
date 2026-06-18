-- ============================================================================
-- Talent Pool — student "work eligibility / bureaucracy" section.
-- Lets a student provide the paperwork companies need: passport scan, UK work
-- visa status, desired work start/end dates (reuses internship_start/end_date),
-- home address, city, country and citizenship. Admin + companies can view them.
-- ============================================================================

-- 1) New columns on student_profiles ----------------------------------------
ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS passport_url  text,        -- storage PATH in the private bucket
  ADD COLUMN IF NOT EXISTS uk_work_visa  text,        -- 'YES' | 'NO' | 'APPLYING'
  ADD COLUMN IF NOT EXISTS home_address  text,
  ADD COLUMN IF NOT EXISTS city          text,
  ADD COLUMN IF NOT EXISTS country        text,
  ADD COLUMN IF NOT EXISTS citizenship    text;

ALTER TABLE public.student_profiles
  DROP CONSTRAINT IF EXISTS student_profiles_uk_work_visa_check;
ALTER TABLE public.student_profiles
  ADD CONSTRAINT student_profiles_uk_work_visa_check
  CHECK (uk_work_visa IS NULL OR uk_work_visa IN ('YES', 'NO', 'APPLYING'));

-- 2) Private bucket for passport scans (sensitive ID document) ---------------
--    Private: no public URL. Access is via short-lived signed URLs minted by
--    the get-passport-url edge function (service role). The unauthenticated
--    Talent Pool client still needs INSERT/UPDATE/DELETE to upload/replace.
INSERT INTO storage.buckets (id, name, public)
VALUES ('talent-pool-passports', 'talent-pool-passports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "passports insert" ON storage.objects;
DROP POLICY IF EXISTS "passports update" ON storage.objects;
DROP POLICY IF EXISTS "passports delete" ON storage.objects;

CREATE POLICY "passports insert" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'talent-pool-passports');
CREATE POLICY "passports update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'talent-pool-passports') WITH CHECK (bucket_id = 'talent-pool-passports');
CREATE POLICY "passports delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'talent-pool-passports');
-- No SELECT policy: objects are private and only reachable through signed URLs.

-- 3) Single update RPC (COALESCE = partial updates never wipe other fields) --
--    Passport upload calls it with only _passport_url set; the "Save" button
--    calls it with the text fields + dates and leaves _passport_url NULL.
CREATE OR REPLACE FUNCTION public.talent_pool_update_student_bureaucracy(
  _user_id          uuid,
  _passport_url     text DEFAULT NULL,
  _uk_work_visa     text DEFAULT NULL,
  _work_start_date  date DEFAULT NULL,
  _work_end_date    date DEFAULT NULL,
  _home_address     text DEFAULT NULL,
  _city             text DEFAULT NULL,
  _country          text DEFAULT NULL,
  _citizenship      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.student_profiles SET
    passport_url         = COALESCE(_passport_url, passport_url),
    uk_work_visa         = COALESCE(_uk_work_visa, uk_work_visa),
    internship_start_date = COALESCE(_work_start_date, internship_start_date),
    internship_end_date   = COALESCE(_work_end_date, internship_end_date),
    home_address         = COALESCE(_home_address, home_address),
    city                 = COALESCE(_city, city),
    country              = COALESCE(_country, country),
    citizenship          = COALESCE(_citizenship, citizenship),
    updated_at           = NOW()
  WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.talent_pool_update_student_bureaucracy(
  uuid, text, text, date, date, text, text, text, text
) TO anon, authenticated, service_role;

-- 4) Expose the new fields (+ work dates) to the admin dashboard -------------
DROP FUNCTION IF EXISTS public.admin_get_students();

CREATE OR REPLACE FUNCTION public.admin_get_students()
 RETURNS TABLE(
   id uuid,
   email text,
   role talent_pool_role,
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
