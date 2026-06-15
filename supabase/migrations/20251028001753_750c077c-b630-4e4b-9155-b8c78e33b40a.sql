-- Create RPC function to set student status (bypass RLS for admin operations)
CREATE OR REPLACE FUNCTION public.tp_set_student_status(
  _student_id uuid,
  _new_status talent_pool_user_status,
  _admin_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_old_status talent_pool_user_status;
BEGIN
  -- Get old status
  SELECT status INTO v_old_status
  FROM public.talent_pool_users
  WHERE id = _student_id AND role = 'STUDENT';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  -- Update status
  UPDATE public.talent_pool_users
  SET 
    status = _new_status,
    updated_at = NOW()
  WHERE id = _student_id AND role = 'STUDENT';

  -- If confirming to active_member, also update student_profiles
  IF _new_status = 'active_member' THEN
    UPDATE public.student_profiles
    SET 
      access_status = 'UNLOCKED',
      payment_status = 'VERIFIED',
      monthly_payment_active = true,
      monthly_payment_start_date = COALESCE(monthly_payment_start_date, NOW()),
      profile_visible_to_companies = true,
      updated_at = NOW()
    WHERE user_id = _student_id;
  END IF;

  -- Log the action
  INSERT INTO public.talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    _admin_id,
    CASE 
      WHEN _new_status = 'rejected' THEN 'STUDENT_REJECTED'
      WHEN _new_status = 'accepted_pending_payment' THEN 'STUDENT_ADMITTED'
      WHEN _new_status = 'active_member' THEN 'STUDENT_CONFIRMED_PAYMENT'
      ELSE 'STUDENT_STATUS_UPDATED'
    END,
    'USER',
    _student_id,
    jsonb_build_object('old_status', v_old_status, 'new_status', _new_status)
  );
END;
$function$;