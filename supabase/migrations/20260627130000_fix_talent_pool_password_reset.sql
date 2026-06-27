-- Talent Pool: fix password reset ? login mismatch.
-- Registration stores base64(UTF-8 password) via btoa(); login decodes the same way.
-- Reset was using encode(_new_password::bytea, 'base64') which can diverge from btoa/convert_to.
-- Also make email lookup case-insensitive (reset already was; login was not).

CREATE OR REPLACE FUNCTION public.talent_pool_hash_password(_password text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT encode(convert_to(trim(_password), 'UTF8'), 'base64');
$$;

CREATE OR REPLACE FUNCTION public.talent_pool_reset_password(
  _token text,
  _new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_reset_id uuid;
  v_expires_at timestamptz;
  v_used boolean;
BEGIN
  SELECT id, user_id, expires_at, used
  INTO v_reset_id, v_user_id, v_expires_at, v_used
  FROM public.talent_pool_password_resets
  WHERE token = _token;

  IF v_reset_id IS NULL OR v_used OR v_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  UPDATE public.talent_pool_users
  SET password_hash = public.talent_pool_hash_password(_new_password),
      updated_at = NOW()
  WHERE id = v_user_id;

  UPDATE public.talent_pool_password_resets
  SET used = TRUE
  WHERE id = v_reset_id;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.talent_pool_login(_email text, _password text, _role talent_pool_role)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user public.talent_pool_users%ROWTYPE;
  v_password text;
  result jsonb;
BEGIN
  SELECT * INTO v_user
  FROM public.talent_pool_users
  WHERE lower(trim(email)) = lower(trim(_email))
    AND role = _role;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS' USING ERRCODE = '28000';
  END IF;

  IF v_user.password_hash IS NULL THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS' USING ERRCODE = '28000';
  END IF;

  v_password := convert_from(decode(v_user.password_hash, 'base64'), 'UTF8');
  IF v_password IS DISTINCT FROM trim(_password) THEN
    RAISE EXCEPTION 'INVALID_CREDENTIALS' USING ERRCODE = '28000';
  END IF;

  IF _role = 'STUDENT' THEN
    result := jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'role', v_user.role,
      'status', v_user.status,
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
      'status', v_user.status,
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
$function$;

GRANT EXECUTE ON FUNCTION public.talent_pool_hash_password(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.talent_pool_reset_password(text, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.talent_pool_login(text, text, talent_pool_role) TO anon, authenticated, service_role;
