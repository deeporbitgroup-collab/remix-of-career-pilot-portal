-- Create auth_password_resets table for reserved area (Associates, Partners, Admin)
CREATE TABLE IF NOT EXISTS public.auth_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.auth_password_resets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert password reset requests
CREATE POLICY "Anyone can request password reset"
ON public.auth_password_resets
FOR INSERT
WITH CHECK (true);

-- Policy: System can update reset tokens
CREATE POLICY "System can update reset tokens"
ON public.auth_password_resets
FOR UPDATE
USING (true);

-- Policy: Users can view their own reset tokens
CREATE POLICY "Users can view own reset tokens"
ON public.auth_password_resets
FOR SELECT
USING (user_id = auth.uid());

-- Function to request password reset and generate token
CREATE OR REPLACE FUNCTION public.request_auth_password_reset(_email TEXT, _role user_role)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_token TEXT;
  v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Find user by email and role
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE email = _email AND role = _role;

  IF v_user_id IS NULL THEN
    -- Don't reveal if email exists or not for security
    RETURN 'REQUEST_SENT';
  END IF;

  -- Generate random token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expiry := NOW() + INTERVAL '1 hour';

  -- Delete any existing unused tokens for this user
  DELETE FROM public.auth_password_resets
  WHERE user_id = v_user_id AND used = FALSE;

  -- Insert new reset token
  INSERT INTO public.auth_password_resets (user_id, token, expires_at)
  VALUES (v_user_id, v_token, v_expiry);

  RETURN v_token;
END;
$$;

-- Function to reset password using token
CREATE OR REPLACE FUNCTION public.reset_auth_password(_token TEXT, _new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_reset_id UUID;
  v_expires_at TIMESTAMP WITH TIME ZONE;
  v_used BOOLEAN;
BEGIN
  -- Find valid reset token
  SELECT id, user_id, expires_at, used
  INTO v_reset_id, v_user_id, v_expires_at, v_used
  FROM public.auth_password_resets
  WHERE token = _token;

  IF v_reset_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_used THEN
    RETURN FALSE;
  END IF;

  IF v_expires_at < NOW() THEN
    RETURN FALSE;
  END IF;

  -- Update password in auth.users using admin API
  -- Note: This requires service role key in edge function
  -- For now we'll just mark as used and the edge function will handle the actual password update
  UPDATE public.auth_password_resets
  SET used = TRUE
  WHERE id = v_reset_id;

  RETURN TRUE;
END;
$$;