-- Create RPC to register a talent pool user (company) bypassing RLS
CREATE OR REPLACE FUNCTION public.talent_pool_register_user(
  _email text,
  _password_base64 text,
  _role text DEFAULT 'COMPANY'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  -- Insert into users table; keep password as provided (base64) to match existing login logic
  INSERT INTO public.talent_pool_users (email, password_hash, role, registration_status)
  VALUES (_email, _password_base64, _role::talent_pool_role, 'PENDING'::registration_status)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Allow anon/authenticated to execute the function
GRANT EXECUTE ON FUNCTION public.talent_pool_register_user(text, text, text) TO anon, authenticated;
