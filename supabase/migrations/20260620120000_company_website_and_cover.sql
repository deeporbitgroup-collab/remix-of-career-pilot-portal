-- Company profile: add a website (NEW 1) and an admin-uploaded cover photo (NEW 2),
-- both separate from the existing logo. Extend update_company_profile to write them.

ALTER TABLE public.company_profiles
  ADD COLUMN IF NOT EXISTS website         text,
  ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- Drop the old 8-arg signature so the 10-arg version below is unambiguous.
DROP FUNCTION IF EXISTS public.update_company_profile(uuid, text, text, company_size, text, text, text, text);

CREATE OR REPLACE FUNCTION public.update_company_profile(
  p_user_id         uuid,
  p_company_name    text,
  p_sector          text,
  p_size            company_size,
  p_reference_email text,
  p_linkedin_url    text,
  p_logo_url        text,
  p_description     text DEFAULT NULL,
  p_website         text DEFAULT NULL,
  p_cover_photo_url text DEFAULT NULL
)
RETURNS company_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile public.company_profiles;
BEGIN
  UPDATE public.company_profiles
  SET company_name   = p_company_name,
      sector         = p_sector,
      size           = p_size,
      reference_email = p_reference_email,
      linkedin_url   = NULLIF(p_linkedin_url, ''),
      logo_url       = NULLIF(p_logo_url, ''),
      description    = p_description,
      website        = NULLIF(p_website, ''),
      -- Cover photo is admin-only; the company self-edit doesn't send it, so keep
      -- the existing value when not provided (don't wipe the admin's upload).
      cover_photo_url = COALESCE(NULLIF(p_cover_photo_url, ''), cover_photo_url),
      updated_at     = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company profile not found for user_id %', p_user_id;
  END IF;

  RETURN v_profile;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.update_company_profile(
  uuid, text, text, company_size, text, text, text, text, text, text
) TO anon, authenticated, service_role;
