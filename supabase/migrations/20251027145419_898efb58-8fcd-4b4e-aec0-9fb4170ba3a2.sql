-- Create new enum for user status in talent pool
DO $$ BEGIN
  CREATE TYPE public.talent_pool_user_status AS ENUM (
    'pending_review',
    'accepted_pending_payment',
    'payment_uploaded',
    'rejected',
    'active_member'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to talent_pool_users table
ALTER TABLE public.talent_pool_users 
ADD COLUMN IF NOT EXISTS status public.talent_pool_user_status DEFAULT 'pending_review';

-- Migrate existing data
UPDATE public.talent_pool_users
SET status = CASE
  WHEN registration_status = 'PENDING' THEN 'pending_review'::public.talent_pool_user_status
  WHEN registration_status = 'REJECTED' THEN 'rejected'::public.talent_pool_user_status
  WHEN registration_status = 'ADMITTED' THEN 'accepted_pending_payment'::public.talent_pool_user_status
  WHEN registration_status = 'APPROVED' THEN 'active_member'::public.talent_pool_user_status
  ELSE 'pending_review'::public.talent_pool_user_status
END
WHERE status IS NULL;

-- Update RPC functions to use new status field
CREATE OR REPLACE FUNCTION public.talent_pool_register_student(
  _first_name text,
  _last_name text,
  _email text,
  _phone text,
  _linkedin text,
  _password_hash text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  -- Create user with new status enum
  INSERT INTO public.talent_pool_users(email, password_hash, role, status)
  VALUES (_email, _password_hash, 'STUDENT'::talent_pool_role, 'pending_review'::talent_pool_user_status)
  RETURNING id INTO v_user_id;

  -- Create profile
  INSERT INTO public.student_profiles(user_id, first_name, last_name, phone, linkedin_url)
  VALUES (v_user_id, _first_name, _last_name, _phone, NULLIF(_linkedin, ''));

  RETURN v_user_id;
END;
$function$;

-- Drop and recreate admin_get_students to include status
DROP FUNCTION IF EXISTS public.admin_get_students();

CREATE FUNCTION public.admin_get_students()
RETURNS TABLE(
  id uuid,
  email text,
  role talent_pool_role,
  registration_status registration_status,
  status talent_pool_user_status,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  profile_id uuid,
  first_name text,
  last_name text,
  phone text,
  linkedin_url text,
  cv_url text,
  cover_letter_url text,
  photo_url text,
  payment_status payment_status,
  access_status access_status,
  payment_reference text,
  monthly_payment_active boolean,
  monthly_payment_start_date timestamp with time zone,
  profile_visible_to_companies boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    tpu.id,
    tpu.email,
    tpu.role,
    tpu.registration_status,
    tpu.status,
    tpu.created_at,
    tpu.updated_at,
    sp.id as profile_id,
    sp.first_name,
    sp.last_name,
    sp.phone,
    sp.linkedin_url,
    sp.cv_url,
    sp.cover_letter_url,
    sp.photo_url,
    sp.payment_status,
    sp.access_status,
    sp.payment_reference,
    sp.monthly_payment_active,
    sp.monthly_payment_start_date,
    sp.profile_visible_to_companies
  FROM public.talent_pool_users tpu
  LEFT JOIN public.student_profiles sp ON tpu.id = sp.user_id
  WHERE tpu.role = 'STUDENT'::talent_pool_role
  ORDER BY tpu.created_at DESC;
$function$;