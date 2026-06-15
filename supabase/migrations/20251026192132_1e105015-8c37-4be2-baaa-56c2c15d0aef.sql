-- Update admin_get_payment_receipts to exclude DELETED receipts
DROP FUNCTION IF EXISTS public.admin_get_payment_receipts();

CREATE OR REPLACE FUNCTION public.admin_get_payment_receipts()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  payment_type text,
  amount numeric,
  receipt_url text,
  verification_status text,
  notes text,
  upload_date timestamp with time zone,
  verified_at timestamp with time zone,
  verified_by uuid,
  created_at timestamp with time zone,
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
  WHERE tpr.verification_status != 'DELETED' OR tpr.verification_status IS NULL
  ORDER BY tpr.created_at DESC;
$$;