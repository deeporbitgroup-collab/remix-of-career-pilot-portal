-- Admin can expel an active student from the Talent Pool with a written reason.
-- Effect: the profile is hidden from companies (profile_visible_to_companies = false),
-- removed from every company's selected list, the user is marked rejected, and the
-- action is logged with the reason. The email (with the reason) is sent separately
-- by the Admin dashboard via the send-status-change-email function (action EXPELLED).

CREATE OR REPLACE FUNCTION public.tp_expel_student(_student_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_status talent_pool_user_status;
BEGIN
  SELECT status INTO v_old_status
  FROM public.talent_pool_users
  WHERE id = _student_id AND role = 'STUDENT';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found';
  END IF;

  -- Hide the profile from companies
  UPDATE public.student_profiles
  SET profile_visible_to_companies = false,
      updated_at = NOW()
  WHERE user_id = _student_id;

  -- Mark the user as no longer an active member of the Talent Pool
  UPDATE public.talent_pool_users
  SET status = 'rejected',
      registration_status = 'REJECTED'::registration_status,
      updated_at = NOW()
  WHERE id = _student_id AND role = 'STUDENT';

  -- Remove the student from every company's selected list
  DELETE FROM public.company_selected_students
  WHERE student_id = _student_id;

  INSERT INTO public.talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    NULL,
    'STUDENT_EXPELLED',
    'USER',
    _student_id,
    jsonb_build_object('old_status', v_old_status, 'reason', _reason)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.tp_expel_student(uuid, text) TO anon, authenticated, service_role;
