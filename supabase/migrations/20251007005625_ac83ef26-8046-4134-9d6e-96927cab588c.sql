-- CRITICAL SECURITY FIX: Add student consent for profile visibility
-- This prevents malicious companies from harvesting all student data

-- Add visibility control column to student_profiles
ALTER TABLE public.student_profiles 
ADD COLUMN profile_visible_to_companies BOOLEAN NOT NULL DEFAULT false;

-- Add index for performance on the new visibility filter
CREATE INDEX idx_student_profiles_visibility 
ON public.student_profiles(profile_visible_to_companies) 
WHERE profile_visible_to_companies = true;

-- Drop the existing overly permissive policy that allowed all companies to see all students
DROP POLICY IF EXISTS "Students can view their own profile" ON public.student_profiles;

-- Recreate policies with proper consent-based access control

-- Students can view and update their own profile
CREATE POLICY "Students can view their own profile"
ON public.student_profiles
FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  -- Admins can view all profiles
  (EXISTS (
    SELECT 1 FROM talent_pool_users
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::talent_pool_role
  ))
  OR
  -- Companies can ONLY view profiles where student has explicitly opted in
  (
    profile_visible_to_companies = true
    AND EXISTS (
      SELECT 1 FROM talent_pool_users
      WHERE id = auth.uid() 
      AND role = 'COMPANY'::talent_pool_role 
      AND registration_status = 'APPROVED'::registration_status
    )
  )
);

COMMENT ON COLUMN public.student_profiles.profile_visible_to_companies IS 
'Privacy control: When true, student has consented to share their profile with approved companies. Defaults to false for privacy-by-default.';

-- Log the security fix
DO $$
BEGIN
  RAISE NOTICE 'SECURITY FIX APPLIED: Student profiles now require explicit consent before being visible to companies.';
  RAISE NOTICE '  - Added profile_visible_to_companies column (defaults to FALSE for privacy)';
  RAISE NOTICE '  - Updated RLS policy to check consent before allowing company access';
  RAISE NOTICE '  - Students must now opt-in to make their profile visible to companies';
END $$;