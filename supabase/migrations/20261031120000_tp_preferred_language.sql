-- Talent Pool: per-account language (Italian / English).
-- Chosen with the IT/EN buttons on the Talent Pool landing; automatic emails
-- read it so each student/company is emailed in the language they picked.
-- Italian is the default; English only if the user switched to it.

ALTER TABLE public.talent_pool_users
  ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'it';

ALTER TABLE public.talent_pool_users
  DROP CONSTRAINT IF EXISTS talent_pool_users_preferred_language_check;
ALTER TABLE public.talent_pool_users
  ADD CONSTRAINT talent_pool_users_preferred_language_check
  CHECK (preferred_language IN ('en', 'it'));

CREATE OR REPLACE FUNCTION public.talent_pool_set_language(p_user_id uuid, p_language text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_language NOT IN ('en', 'it') THEN
    RAISE EXCEPTION 'INVALID_LANGUAGE';
  END IF;

  UPDATE public.talent_pool_users
  SET preferred_language = p_language
  WHERE id = p_user_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.talent_pool_set_language(uuid, text) TO anon, authenticated, service_role;
