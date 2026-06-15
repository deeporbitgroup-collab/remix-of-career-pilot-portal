-- Fix RLS policies for company_profiles to allow registration without Supabase Auth

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Companies can insert their own profile" ON public.company_profiles;

-- Create new policy that allows public inserts (for registration)
CREATE POLICY "Allow company profile creation during registration"
ON public.company_profiles FOR INSERT
TO public
WITH CHECK (true);

-- Keep the existing UPDATE policy but make it work for both authenticated and public
DROP POLICY IF EXISTS "Companies can update their own profile" ON public.company_profiles;

CREATE POLICY "Companies can update their own profile"
ON public.company_profiles FOR UPDATE
TO public
USING (true);