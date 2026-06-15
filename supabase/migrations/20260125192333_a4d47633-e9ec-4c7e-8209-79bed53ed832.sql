-- Fix case-sensitive email comparison in password reset function
CREATE OR REPLACE FUNCTION public.request_auth_password_reset(_email text, _role user_role)
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
  -- Find user by email and role (case-insensitive)
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE LOWER(email) = LOWER(_email) AND role = _role;

  IF v_user_id IS NULL THEN
    -- Don't reveal if email exists or not for security
    RETURN 'REQUEST_SENT';
  END IF;

  -- Generate random token using the extensions schema explicitly
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expiry := NOW() + INTERVAL '1 hour';

  -- Delete any existing unused tokens for this user
  DELETE FROM public.auth_password_resets
  WHERE user_id = v_user_id AND used = FALSE;

  -- Insert new reset token
  INSERT INTO public.auth_password_resets (user_id, token, expires_at)
  VALUES (v_user_id, v_token, v_expiry);

  RETURN v_token;
END;
$function$;