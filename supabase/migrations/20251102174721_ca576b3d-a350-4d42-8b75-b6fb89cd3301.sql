-- Add description column to company_profiles if missing
ALTER TABLE public.company_profiles
ADD COLUMN IF NOT EXISTS description text;

-- Create RPC to update company profile by user_id
CREATE OR REPLACE FUNCTION public.update_company_profile(
  p_user_id uuid,
  p_company_name text,
  p_sector text,
  p_size company_size,
  p_reference_email text,
  p_linkedin_url text,
  p_logo_url text,
  p_description text DEFAULT NULL
) RETURNS public.company_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.company_profiles;
BEGIN
  UPDATE public.company_profiles
  SET company_name = p_company_name,
      sector = p_sector,
      size = p_size,
      reference_email = p_reference_email,
      linkedin_url = NULLIF(p_linkedin_url, ''),
      logo_url = NULLIF(p_logo_url, ''),
      description = p_description,
      updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Company profile not found for user_id %', p_user_id;
  END IF;

  RETURN v_profile;
END;
$$;