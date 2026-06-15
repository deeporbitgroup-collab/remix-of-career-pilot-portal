-- Update admin_verify_payment_and_grant_access to also make student visible to companies
CREATE OR REPLACE FUNCTION public.admin_verify_payment_and_grant_access(_user_id uuid, _receipt_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify payment receipt
  UPDATE public.talent_pool_payment_receipts
  SET verification_status = 'VERIFIED',
      verified_at = NOW(),
      verified_by = auth.uid()
  WHERE id = _receipt_id;

  -- Grant access to student AND make visible to companies
  UPDATE public.student_profiles
  SET access_status = 'UNLOCKED',
      payment_status = 'VERIFIED',
      monthly_payment_active = true,
      monthly_payment_start_date = COALESCE(monthly_payment_start_date, NOW()),
      profile_visible_to_companies = true,
      updated_at = NOW()
  WHERE user_id = _user_id;

  -- Ensure registration status is APPROVED
  UPDATE public.talent_pool_users
  SET registration_status = 'APPROVED',
      updated_at = NOW()
  WHERE id = _user_id;

  -- Log action
  INSERT INTO public.talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    auth.uid(),
    'PAYMENT_VERIFIED_AND_ACCESS_GRANTED',
    'USER',
    _user_id,
    jsonb_build_object('receipt_id', _receipt_id)
  );
END;
$function$;