-- Fix RLS policies for talent_pool_users to avoid infinite recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update their own data" ON talent_pool_users;
DROP POLICY IF EXISTS "Users can view their own data" ON talent_pool_users;

-- Create fixed policies without recursion
CREATE POLICY "Users can update their own data" 
ON talent_pool_users 
FOR UPDATE 
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can view their own data" 
ON talent_pool_users 
FOR SELECT 
USING (id = auth.uid());

-- Create admin policies separately to avoid recursion
CREATE POLICY "Admin can view all users" 
ON talent_pool_users 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM talent_pool_users admin_user
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'ADMIN'::talent_pool_role
    LIMIT 1
  )
);

CREATE POLICY "Admin can update all users" 
ON talent_pool_users 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM talent_pool_users admin_user
    WHERE admin_user.id = auth.uid() 
    AND admin_user.role = 'ADMIN'::talent_pool_role
    LIMIT 1
  )
);