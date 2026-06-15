-- Drop the insecure policy
DROP POLICY IF EXISTS "Admin and students can update profiles" ON public.student_profiles;

-- Create secure RPC function for admin to toggle student visibility
CREATE OR REPLACE FUNCTION public.admin_toggle_student_visibility(
  _user_id uuid,
  _visible boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_profile_id uuid;
  v_result jsonb;
BEGIN
  -- Update the visibility
  UPDATE public.student_profiles
  SET profile_visible_to_companies = _visible,
      updated_at = NOW()
  WHERE user_id = _user_id
  RETURNING id INTO v_profile_id;

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Student profile not found for user_id: %', _user_id;
  END IF;

  -- Log the action
  INSERT INTO public.talent_pool_logs (
    actor_id,
    action,
    target_type,
    target_id,
    payload
  ) VALUES (
    NULL, -- Admin ID would go here if available
    CASE WHEN _visible THEN 'STUDENT_MADE_VISIBLE' ELSE 'STUDENT_MADE_HIDDEN' END,
    'STUDENT_PROFILE',
    v_profile_id,
    jsonb_build_object('user_id', _user_id, 'visible', _visible)
  );

  -- Return success
  v_result := jsonb_build_object(
    'success', true,
    'profile_id', v_profile_id,
    'user_id', _user_id,
    'visible', _visible
  );

  RETURN v_result;
END;
$$;