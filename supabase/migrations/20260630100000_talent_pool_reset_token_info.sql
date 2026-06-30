-- Return role for a valid reset token so the reset page redirects to the correct login.
CREATE OR REPLACE FUNCTION public.talent_pool_get_reset_token_info(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reset public.talent_pool_password_resets%ROWTYPE;
  v_role public.talent_pool_role;
BEGIN
  SELECT * INTO v_reset
  FROM public.talent_pool_password_resets
  WHERE token = _token;

  IF v_reset.id IS NULL OR v_reset.used OR v_reset.expires_at < NOW() THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  SELECT role INTO v_role
  FROM public.talent_pool_users
  WHERE id = v_reset.user_id;

  IF v_role IS NULL THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'role', lower(v_role::text)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.talent_pool_get_reset_token_info(text) TO anon, authenticated, service_role;
