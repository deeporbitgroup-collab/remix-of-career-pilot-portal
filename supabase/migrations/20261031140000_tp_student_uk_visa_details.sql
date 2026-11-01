-- Talent Pool: when a student has the right to work in the UK (uk_work_visa = 'YES')
-- they also state which visa they hold (free text) and when it expires.

ALTER TABLE public.student_profiles
  ADD COLUMN IF NOT EXISTS uk_visa_type   text,
  ADD COLUMN IF NOT EXISTS uk_visa_expiry date;

CREATE OR REPLACE FUNCTION public.talent_pool_update_student_uk_visa(
  _user_id uuid,
  _visa_type text,
  _visa_expiry date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.student_profiles
  SET uk_visa_type   = NULLIF(trim(COALESCE(_visa_type, '')), ''),
      uk_visa_expiry = _visa_expiry,
      updated_at     = now()
  WHERE user_id = _user_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.talent_pool_update_student_uk_visa(uuid, text, date) TO anon, authenticated, service_role;
