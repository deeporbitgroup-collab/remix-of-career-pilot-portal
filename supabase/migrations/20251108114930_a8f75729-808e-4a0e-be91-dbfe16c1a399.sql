-- Create secure function to insert company profile (bypasses RLS)
CREATE OR REPLACE FUNCTION public.talent_pool_create_company_profile(
  _user_id uuid,
  _company_name text,
  _sector text,
  _size company_size,
  _reference_email text,
  _linkedin_url text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  INSERT INTO public.company_profiles (
    user_id,
    company_name,
    sector,
    size,
    reference_email,
    linkedin_url
  ) VALUES (
    _user_id,
    _company_name,
    _sector,
    _size,
    _reference_email,
    NULLIF(_linkedin_url, '')
  )
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$;