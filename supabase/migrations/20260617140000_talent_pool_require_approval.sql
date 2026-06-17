-- Talent Pool: require admin approval for NEW student registrations.
--
-- New students are created PENDING and NOT visible to companies. An admin
-- "Ammetti" turns them into active_member + visible. Access is FREE: payment_status
-- and access_status stay "satisfied" so they never gate the student (the student
-- can log in and browse companies immediately). The ONLY gate is approval, via
-- profile_visible_to_companies (false until approved).
--
-- IMPORTANT: this migration ONLY redefines two functions. It contains NO UPDATE on
-- existing rows. The 4 current students stay active_member / APPROVED / visible,
-- fully untouched (email, CV, profile preserved). The change applies only to
-- registrations made from now on.

-- 1) New registrations start PENDING and hidden from companies (but the student
--    keeps UNLOCKED + VERIFIED so they can use their area and browse companies).
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
  VALUES (_email, _password_hash, 'STUDENT'::talent_pool_role, 'pending_review'::talent_pool_user_status, 'PENDING'::registration_status)
  RETURNING id INTO v_user_id;

  INSERT INTO public.student_profiles(
    user_id, first_name, last_name, phone, linkedin_url,
    access_status, payment_status, monthly_payment_active, monthly_payment_start_date, profile_visible_to_companies
  )
  VALUES (
    v_user_id, _first_name, _last_name, _phone, NULLIF(_linkedin, ''),
    -- Free access: UNLOCKED + VERIFIED stay "satisfied" so nothing gates the student.
    -- profile_visible_to_companies = false => hidden from companies until approved.
    'UNLOCKED'::access_status, 'VERIFIED'::payment_status, true, NOW(), false
  );

  RETURN v_user_id;
END;
$function$;

-- 2) On approval (active_member) also set registration_status = APPROVED, so the
--    record is fully approved. (The previous version updated only student_profiles.)
--    Everything else is unchanged from the existing function.
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
  SELECT status INTO v_old_status
  FROM public.talent_pool_users
  WHERE id = _student_id AND role = 'STUDENT';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  UPDATE public.talent_pool_users
  SET
    status = _new_status,
    registration_status = CASE
      WHEN _new_status = 'active_member' THEN 'APPROVED'::registration_status
      ELSE registration_status
    END,
    updated_at = NOW()
  WHERE id = _student_id AND role = 'STUDENT';

  -- If approving to active_member, unlock + make visible to companies.
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

  INSERT INTO public.talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    _admin_id,
    CASE
      WHEN _new_status = 'rejected' THEN 'STUDENT_REJECTED'
      WHEN _new_status = 'accepted_pending_payment' THEN 'STUDENT_ADMITTED'
      WHEN _new_status = 'active_member' THEN 'STUDENT_APPROVED'
      ELSE 'STUDENT_STATUS_UPDATED'
    END,
    'USER',
    _student_id,
    jsonb_build_object('old_status', v_old_status, 'new_status', _new_status)
  );
END;
$function$;
