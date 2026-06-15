-- Create function to get all payment receipts for admin
CREATE OR REPLACE FUNCTION public.admin_get_payment_receipts()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  payment_type text,
  amount numeric,
  receipt_url text,
  verification_status text,
  notes text,
  upload_date timestamptz,
  verified_at timestamptz,
  verified_by uuid,
  created_at timestamptz,
  user_email text,
  first_name text,
  last_name text,
  phone text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tpr.id,
    tpr.user_id,
    tpr.payment_type,
    tpr.amount,
    tpr.receipt_url,
    tpr.verification_status,
    tpr.notes,
    tpr.upload_date,
    tpr.verified_at,
    tpr.verified_by,
    tpr.created_at,
    tpu.email as user_email,
    sp.first_name,
    sp.last_name,
    sp.phone
  FROM public.talent_pool_payment_receipts tpr
  LEFT JOIN public.talent_pool_users tpu ON tpr.user_id = tpu.id
  LEFT JOIN public.student_profiles sp ON tpr.user_id = sp.user_id
  ORDER BY tpr.created_at DESC;
$$;

-- Create function to get all students for admin
CREATE OR REPLACE FUNCTION public.admin_get_students()
RETURNS TABLE (
  id uuid,
  email text,
  role talent_pool_role,
  registration_status registration_status,
  created_at timestamptz,
  updated_at timestamptz,
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
  monthly_payment_start_date timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tpu.id,
    tpu.email,
    tpu.role,
    tpu.registration_status,
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
    sp.monthly_payment_start_date
  FROM public.talent_pool_users tpu
  LEFT JOIN public.student_profiles sp ON tpu.id = sp.user_id
  WHERE tpu.role = 'STUDENT'::talent_pool_role
  ORDER BY tpu.created_at DESC;
$$;

-- Create function to get all companies for admin
CREATE OR REPLACE FUNCTION public.admin_get_companies()
RETURNS TABLE (
  id uuid,
  email text,
  role talent_pool_role,
  registration_status registration_status,
  created_at timestamptz,
  updated_at timestamptz,
  profile_id uuid,
  company_name text,
  sector text,
  size company_size,
  reference_email text,
  linkedin_url text,
  logo_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tpu.id,
    tpu.email,
    tpu.role,
    tpu.registration_status,
    tpu.created_at,
    tpu.updated_at,
    cp.id as profile_id,
    cp.company_name,
    cp.sector,
    cp.size,
    cp.reference_email,
    cp.linkedin_url,
    cp.logo_url
  FROM public.talent_pool_users tpu
  LEFT JOIN public.company_profiles cp ON tpu.id = cp.user_id
  WHERE tpu.role = 'COMPANY'::talent_pool_role
  ORDER BY tpu.created_at DESC;
$$;