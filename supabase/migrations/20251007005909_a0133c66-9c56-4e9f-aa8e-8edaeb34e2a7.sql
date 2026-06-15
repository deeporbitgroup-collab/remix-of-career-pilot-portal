-- CRITICAL SECURITY FIX: Prevent login_attempts table flooding
-- Remove unrestricted public INSERT access and require admin-only access

-- Drop the insecure policy that allows anyone to insert login attempts
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;

-- Create new secure policy: Only admins can insert login attempts
CREATE POLICY "Only admins and service role can insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role
  )
);

-- Add index for efficient IP-based rate limiting queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_created 
ON public.login_attempts(ip_address, created_at DESC);

-- Add index for efficient email-based queries
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_created 
ON public.login_attempts(email, created_at DESC);

COMMENT ON POLICY "Only admins and service role can insert login attempts" ON public.login_attempts IS 
'Security: Prevents malicious actors from flooding the login_attempts table. Login attempts should be logged server-side via Edge Function with rate limiting.';

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE 'SECURITY FIX APPLIED: login_attempts table is now protected from flooding attacks.';
  RAISE NOTICE '  - Removed public INSERT policy that allowed unrestricted access';
  RAISE NOTICE '  - Created admin-only INSERT policy for authorized logging';
  RAISE NOTICE '  - Added indexes for efficient rate limiting queries';
  RAISE NOTICE '  - Login attempts should now be logged via secure Edge Function';
END $$;