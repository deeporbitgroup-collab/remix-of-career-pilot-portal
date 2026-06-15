-- Create admin helper RPCs to guarantee persistent actions via SECURITY DEFINER
-- 1) Permanently delete a payment receipt
CREATE OR REPLACE FUNCTION public.tp_admin_delete_payment_receipt(_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.talent_pool_payment_receipts
  WHERE id = _receipt_id;
END;
$$;

-- 2) Revoke a student's access completely and hide them from companies
CREATE OR REPLACE FUNCTION public.tp_admin_revoke_student(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update student visibility and access
  UPDATE public.student_profiles
  SET 
    access_status = 'BLOCKED',
    monthly_payment_active = false,
    profile_visible_to_companies = false,
    updated_at = NOW()
  WHERE user_id = _user_id;

  -- Update user status
  UPDATE public.talent_pool_users
  SET 
    status = 'rejected',
    updated_at = NOW()
  WHERE id = _user_id AND role = 'STUDENT';

  -- Log the action
  INSERT INTO public.talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    NULL,
    'ACCESS_REVOKED',
    'USER',
    _user_id,
    jsonb_build_object('reason', 'Admin action via RPC')
  );
END;
$$;

-- 3) Permanently delete a Talent Pool user (student or company) and related data
CREATE OR REPLACE FUNCTION public.tp_admin_delete_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role talent_pool_role;
BEGIN
  -- Determine role
  SELECT role INTO v_role FROM public.talent_pool_users WHERE id = _user_id;

  -- Remove selections (both as company and as student)
  DELETE FROM public.company_selected_students WHERE company_id = _user_id OR student_id = _user_id;

  -- Remove payment receipts
  DELETE FROM public.talent_pool_payment_receipts WHERE user_id = _user_id;

  -- Remove profiles depending on role
  IF v_role = 'STUDENT' THEN
    DELETE FROM public.student_profiles WHERE user_id = _user_id;
  ELSIF v_role = 'COMPANY' THEN
    DELETE FROM public.company_profiles WHERE user_id = _user_id;
  END IF;

  -- Remove user record
  DELETE FROM public.talent_pool_users WHERE id = _user_id;

  -- Log the action
  INSERT INTO public.talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    NULL,
    'USER_DELETED',
    'USER',
    _user_id,
    jsonb_build_object('role', v_role)
  );
END;
$$;