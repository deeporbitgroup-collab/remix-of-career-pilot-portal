-- Add preferred_locations field to student_profiles
ALTER TABLE public.student_profiles
ADD COLUMN IF NOT EXISTS preferred_locations TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Update the talent_pool_update_student_preferences function to include preferred_locations
DROP FUNCTION IF EXISTS public.talent_pool_update_student_preferences(uuid, text[], text[], text, text, date, date);

CREATE OR REPLACE FUNCTION public.talent_pool_update_student_preferences(
  _user_id uuid,
  _preferred_company_types text[],
  _preferred_sectors text[],
  _internship_period text,
  _compensation_preference text,
  _internship_start_date date DEFAULT NULL,
  _internship_end_date date DEFAULT NULL,
  _preferred_locations text[] DEFAULT ARRAY[]::text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.student_profiles
  SET preferred_company_types = COALESCE(_preferred_company_types, preferred_company_types),
      preferred_sectors = COALESCE(_preferred_sectors, preferred_sectors),
      internship_period = _internship_period,
      compensation_preference = _compensation_preference,
      internship_start_date = COALESCE(_internship_start_date, internship_start_date),
      internship_end_date = COALESCE(_internship_end_date, internship_end_date),
      preferred_locations = COALESCE(_preferred_locations, preferred_locations),
      updated_at = NOW()
  WHERE user_id = _user_id;
END;
$$;