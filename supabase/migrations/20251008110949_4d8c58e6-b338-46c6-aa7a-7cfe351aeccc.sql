-- Create secure RPC for Talent Pool login that bypasses RLS safely
-- Returns structure compatible with existing frontend (student_profiles/company_profiles as arrays)

-- Drop if exists to allow re-run safely
DROP FUNCTION IF EXISTS public.talent_pool_login(text, text, talent_pool_role);

CREATE OR REPLACE FUNCTION public.talent_pool_login(_email text, _password text, _role talent_pool_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.talent_pool_users%ROWTYPE;
  v_password text;
  result jsonb;
BEGIN
  -- Fetch user by email and role
  SELECT * INTO v_user
  FROM public.talent_pool_users
  WHERE email = _email AND role = _role;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS' USING ERRCODE = '28000';
  END IF;

  IF v_user.password_hash IS NULL THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS' USING ERRCODE = '28000';
  END IF;

  -- Decode base64 stored password and compare (note: this is a simple demo, use hashing in production)
  v_password := convert_from(decode(v_user.password_hash, 'base64'), 'UTF8');
  IF v_password IS DISTINCT FROM _password THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS' USING ERRCODE = '28000';
  END IF;

  -- Build response JSON in a frontend-compatible shape
  IF _role = 'STUDENT' THEN
    result := jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'role', v_user.role,
      'registration_status', v_user.registration_status,
      'created_at', v_user.created_at,
      'updated_at', v_user.updated_at,
      'student_profiles', (
        SELECT COALESCE(jsonb_agg(to_jsonb(sp)), '[]'::jsonb)
        FROM public.student_profiles sp
        WHERE sp.user_id = v_user.id
      )
    );
  ELSIF _role = 'COMPANY' THEN
    result := jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'role', v_user.role,
      'registration_status', v_user.registration_status,
      'created_at', v_user.created_at,
      'updated_at', v_user.updated_at,
      'company_profiles', (
        SELECT COALESCE(jsonb_agg(to_jsonb(cp)), '[]'::jsonb)
        FROM public.company_profiles cp
        WHERE cp.user_id = v_user.id
      )
    );
  ELSE
    result := to_jsonb(v_user) - 'password_hash';
  END IF;

  RETURN result;
END;
$$;

-- Ensure only authenticated callers can execute if desired; here we allow since SECURITY DEFINER controls access
-- Optionally you can REVOKE ALL ON FUNCTION and then GRANT EXECUTE to authenticated role
