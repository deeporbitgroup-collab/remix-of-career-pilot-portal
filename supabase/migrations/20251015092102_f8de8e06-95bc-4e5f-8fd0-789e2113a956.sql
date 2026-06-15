-- Student RPCs to bypass RLS while enforcing business rules

-- 1) Get student profile by user id
CREATE OR REPLACE FUNCTION public.talent_pool_get_student_profile(_user_id uuid)
RETURNS public.student_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sp.*
  FROM public.student_profiles sp
  WHERE sp.user_id = _user_id
  LIMIT 1;
$$;

-- 2) Get companies visible to a student (only if unlocked & verified & approved)
CREATE OR REPLACE FUNCTION public.talent_pool_get_companies_for_student(_user_id uuid)
RETURNS SETOF public.company_profiles
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cp.*
  FROM public.company_profiles cp
  WHERE EXISTS (
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
$$;

-- 3) Update student photo url
CREATE OR REPLACE FUNCTION public.talent_pool_update_student_photo(
  _user_id uuid,
  _photo_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_profiles
  SET photo_url = _photo_url,
      updated_at = NOW()
  WHERE user_id = _user_id;
END;
$$;

-- 4) Update student preferences
CREATE OR REPLACE FUNCTION public.talent_pool_update_student_preferences(
  _user_id uuid,
  _preferred_company_types text[],
  _preferred_sectors text[],
  _internship_period text,
  _compensation_preference text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_profiles
  SET preferred_company_types = COALESCE(_preferred_company_types, preferred_company_types),
      preferred_sectors = COALESCE(_preferred_sectors, preferred_sectors),
      internship_period = _internship_period,
      compensation_preference = _compensation_preference,
      updated_at = NOW()
  WHERE user_id = _user_id;
END;
$$;

-- 5) Get latest payment by user
CREATE OR REPLACE FUNCTION public.talent_pool_get_latest_payment(
  _user_id uuid
)
RETURNS public.talent_pool_payments
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.*
  FROM public.talent_pool_payments p
  WHERE p.user_id = _user_id
  ORDER BY p.created_at DESC
  LIMIT 1;
$$;