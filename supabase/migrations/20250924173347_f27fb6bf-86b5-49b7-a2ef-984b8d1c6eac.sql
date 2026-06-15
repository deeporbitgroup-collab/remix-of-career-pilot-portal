-- Create initial admin user (only if not exists)
-- Note: Password should be managed via environment variable in production
-- This is for seeding purposes only

-- First, ensure the admin user exists in auth.users
-- We'll use a DO block to handle the conditional insert
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'Careerpilot2025@gmail.com';
  
  -- If admin doesn't exist, we'll note it
  -- The actual user creation should be done via Supabase Auth API
  -- to ensure proper password hashing
  IF admin_user_id IS NULL THEN
    RAISE NOTICE 'Admin user does not exist. Please create via Supabase Auth.';
  ELSE
    -- Ensure admin profile exists with proper role
    INSERT INTO public.profiles (
      id, 
      email, 
      phone, 
      first_name, 
      last_name, 
      role, 
      status
    )
    VALUES (
      admin_user_id,
      'Careerpilot2025@gmail.com',
      '+39 000 000 0000',
      'Admin',
      'Career Pilot',
      'ADMIN',
      'approved'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
      role = 'ADMIN',
      status = 'approved',
      updated_at = NOW();
  END IF;
END $$;