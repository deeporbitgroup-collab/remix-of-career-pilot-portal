-- Fix: qualify gen_random_bytes() with extensions schema due to search_path
CREATE OR REPLACE FUNCTION public.talent_pool_request_password_reset(_email text, _role talent_pool_role)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_token TEXT;
  v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find user by email and role
  SELECT id INTO v_user_id
  FROM public.talent_pool_users
  WHERE email = _email AND role = _role;

  IF v_user_id IS NULL THEN
    -- Don't reveal if email exists or not for security
    RETURN 'REQUEST_SENT';
  END IF;

  -- Generate random token (use extensions schema explicitly)
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expiry := NOW() + INTERVAL '1 hour';

  -- Delete any existing unused tokens for this user
  DELETE FROM public.talent_pool_password_resets
  WHERE user_id = v_user_id AND used = FALSE;

  -- Insert new reset token
  INSERT INTO public.talent_pool_password_resets (user_id, token, expires_at)
  VALUES (v_user_id, v_token, v_expiry);

  RETURN v_token;
END;
$function$;