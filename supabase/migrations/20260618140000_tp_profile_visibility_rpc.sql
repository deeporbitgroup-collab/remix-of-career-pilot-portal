-- Talent Pool: SECURITY DEFINER RPC to toggle a student's company visibility.
--
-- The Talent Pool app is unauthenticated (localStorage session, anon key), and the
-- anon role has no UPDATE grant/policy on student_profiles. The student dashboard's
-- "Profile Visibility" checkbox and the admin "hide a misbehaving student" control
-- therefore did a direct UPDATE that silently failed. This RPC performs the update
-- with definer rights so both paths work, without opening a broad anon UPDATE policy.

CREATE OR REPLACE FUNCTION public.tp_set_profile_visibility(
  _student_id uuid,
  _visible boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.student_profiles
  SET profile_visible_to_companies = _visible,
      updated_at = NOW()
  WHERE user_id = _student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student profile not found';
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.tp_set_profile_visibility(uuid, boolean)
  TO anon, authenticated, service_role;
