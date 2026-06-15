-- Fix the trigger to handle missing metadata properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create improved handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Insert profile with default values if metadata is missing
    INSERT INTO public.profiles (
        id, 
        email, 
        phone, 
        first_name, 
        last_name, 
        company_name, 
        role, 
        status
    )
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'phone', ''),
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        COALESCE(new.raw_user_meta_data->>'company_name', ''),
        COALESCE((new.raw_user_meta_data->>'role')::user_role, 'ASSOCIATE'::user_role), -- Default to ASSOCIATE if no role
        'pending'::user_status
    );
    RETURN new;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't block user creation
        RAISE LOG 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Add RLS policy to allow trigger to insert profiles
CREATE POLICY "System can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (true);

-- Now create the admin user directly in both tables
-- First, create the auth user (this will be done via Supabase function)
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Check if admin already exists
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'Careerpilot2025@gmail.com';
    
    IF admin_user_id IS NULL THEN
        -- Create admin user in auth.users
        -- Note: We can't directly insert into auth.users from a migration
        -- So we'll create a temporary function to do it
        RAISE NOTICE 'Admin user needs to be created via Supabase Dashboard';
    ELSE
        -- Update the existing profile if user exists
        UPDATE public.profiles 
        SET 
            role = 'ADMIN'::user_role,
            status = 'approved'::user_status,
            first_name = 'Admin',
            last_name = 'User'
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Admin profile updated successfully';
    END IF;
END $$;

-- Create a helper function to manually create admin profile after user is created
CREATE OR REPLACE FUNCTION public.create_admin_profile(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_id uuid;
BEGIN
    -- Get user id from email
    SELECT id INTO user_id 
    FROM auth.users 
    WHERE email = user_email;
    
    IF user_id IS NOT NULL THEN
        -- Insert or update profile
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
            user_id,
            user_email,
            '',
            'Admin',
            'User',
            'ADMIN'::user_role,
            'approved'::user_status
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            role = 'ADMIN'::user_role,
            status = 'approved'::user_status,
            first_name = 'Admin',
            last_name = 'User';
            
        RAISE NOTICE 'Admin profile created/updated successfully';
    ELSE
        RAISE EXCEPTION 'User with email % not found', user_email;
    END IF;
END;
$$;