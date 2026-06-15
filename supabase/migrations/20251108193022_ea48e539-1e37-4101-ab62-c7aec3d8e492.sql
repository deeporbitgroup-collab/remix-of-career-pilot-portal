-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS public.talent_pool_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.talent_pool_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.talent_pool_password_resets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert reset tokens
CREATE POLICY "Anyone can request password reset"
  ON public.talent_pool_password_resets
  FOR INSERT
  WITH CHECK (true);

-- Users can view their own reset tokens
CREATE POLICY "Users can view own reset tokens"
  ON public.talent_pool_password_resets
  FOR SELECT
  USING (user_id = auth.uid());

-- Create index for performance
CREATE INDEX idx_password_reset_token ON public.talent_pool_password_resets(token);
CREATE INDEX idx_password_reset_expiry ON public.talent_pool_password_resets(expires_at);

-- Function to create password reset token
CREATE OR REPLACE FUNCTION public.talent_pool_request_password_reset(
  _email TEXT,
  _role talent_pool_role
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- Generate random token
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expiry := NOW() + INTERVAL '1 hour';

  -- Delete any existing unused tokens for this user
  DELETE FROM public.talent_pool_password_resets
  WHERE user_id = v_user_id AND used = FALSE;

  -- Insert new reset token
  INSERT INTO public.talent_pool_password_resets (user_id, token, expires_at)
  VALUES (v_user_id, v_token, v_expiry);

  RETURN v_token;
END;
$$;

-- Function to reset password using token
CREATE OR REPLACE FUNCTION public.talent_pool_reset_password(
  _token TEXT,
  _new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  FROM public.talent_pool_password_resets
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

  -- Update password (encode as base64 to match existing logic)
  UPDATE public.talent_pool_users
  SET password_hash = encode(_new_password::bytea, 'base64'),
      updated_at = NOW()
  WHERE id = v_user_id;

  -- Mark token as used
  UPDATE public.talent_pool_password_resets
  SET used = TRUE
  WHERE id = v_reset_id;

  RETURN TRUE;
END;
$$;