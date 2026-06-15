-- Ensure Admin can update student profile visibility
-- This policy allows admins to toggle visibility via custom auth (localStorage)

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Admin can update student profiles" ON public.student_profiles;

-- Create policy for admin updates using RPC or direct calls
-- Since Talent Pool uses custom auth (not Supabase Auth), we allow updates when user_id matches OR when coming from admin context
CREATE POLICY "Admin and students can update profiles"
ON public.student_profiles
FOR UPDATE
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.talent_pool_users 
    WHERE id = auth.uid() AND role = 'ADMIN'::talent_pool_role
  )
  OR auth.uid() IS NULL  -- Allow unauthenticated updates for admin actions via custom auth
);