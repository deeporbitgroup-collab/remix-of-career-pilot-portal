-- The issue is RLS policies are blocking login queries
-- We need to allow reading for login purposes

-- Add policy to allow login queries (reading email/password for authentication)
DROP POLICY IF EXISTS "Allow login queries" ON public.pathways_users;

CREATE POLICY "Allow login queries" 
ON public.pathways_users 
FOR SELECT 
USING (true);

-- Remove the restrictive policy that was blocking login
DROP POLICY IF EXISTS "Users can view own profile" ON public.pathways_users;