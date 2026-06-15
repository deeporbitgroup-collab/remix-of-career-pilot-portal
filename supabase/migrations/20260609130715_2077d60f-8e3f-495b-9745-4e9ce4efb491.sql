
-- Make new student registrations immediately active (no payment phase)
CREATE OR REPLACE FUNCTION public.talent_pool_register_student(_first_name text, _last_name text, _email text, _phone text, _linkedin text, _password_hash text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
BEGIN
  INSERT INTO public.talent_pool_users(email, password_hash, role, status, registration_status)
  VALUES (_email, _password_hash, 'STUDENT'::talent_pool_role, 'active_member'::talent_pool_user_status, 'APPROVED'::registration_status)
  RETURNING id INTO v_user_id;

  INSERT INTO public.student_profiles(
    user_id, first_name, last_name, phone, linkedin_url,
    access_status, payment_status, monthly_payment_active, monthly_payment_start_date, profile_visible_to_companies
  )
  VALUES (
    v_user_id, _first_name, _last_name, _phone, NULLIF(_linkedin, ''),
    'UNLOCKED'::access_status, 'VERIFIED'::payment_status, true, NOW(), true
  );

  RETURN v_user_id;
END;
$function$;

-- Upgrade any existing students stuck in payment phases to active
UPDATE public.talent_pool_users
SET status = 'active_member'::talent_pool_user_status,
    registration_status = 'APPROVED'::registration_status,
    updated_at = NOW()
WHERE role = 'STUDENT'
  AND status IN ('pending_review'::talent_pool_user_status, 'accepted_pending_payment'::talent_pool_user_status, 'payment_uploaded'::talent_pool_user_status);

UPDATE public.student_profiles sp
SET access_status = 'UNLOCKED'::access_status,
    payment_status = 'VERIFIED'::payment_status,
    monthly_payment_active = true,
    monthly_payment_start_date = COALESCE(monthly_payment_start_date, NOW()),
    profile_visible_to_companies = true,
    updated_at = NOW()
FROM public.talent_pool_users u
WHERE u.id = sp.user_id
  AND u.role = 'STUDENT'
  AND (sp.access_status <> 'UNLOCKED' OR sp.payment_status <> 'VERIFIED' OR sp.profile_visible_to_companies IS DISTINCT FROM true);
