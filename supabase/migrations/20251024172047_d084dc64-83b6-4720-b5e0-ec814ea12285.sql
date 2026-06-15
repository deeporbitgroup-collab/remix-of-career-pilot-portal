-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can insert during registration" ON pathways_users;

-- Create new policy that allows unauthenticated registration for students only
CREATE POLICY "Allow student registration without auth"
ON pathways_users
FOR INSERT
WITH CHECK (
  role = 'STUDENT'
  AND email IS NOT NULL
  AND password_hash IS NOT NULL
);

-- Ensure admin inserts still work (authenticated only)
CREATE POLICY "Allow admin user creation"
ON pathways_users
FOR INSERT
WITH CHECK (
  role = 'ADMIN'
  AND auth.uid() IS NOT NULL
);