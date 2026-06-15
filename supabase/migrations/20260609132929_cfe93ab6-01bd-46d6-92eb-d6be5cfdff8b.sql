CREATE OR REPLACE FUNCTION public.talent_pool_get_user_with_profile(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user public.talent_pool_users%ROWTYPE;
  result jsonb;
BEGIN
  SELECT * INTO v_user FROM public.talent_pool_users WHERE id = _user_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_user.role = 'COMPANY'::talent_pool_role THEN
    result := jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'role', v_user.role,
      'status', v_user.status,
      'registration_status', v_user.registration_status,
      'created_at', v_user.created_at,
      'updated_at', v_user.updated_at,
      'company_profiles', (
        SELECT COALESCE(jsonb_agg(to_jsonb(cp)), '[]'::jsonb)
        FROM public.company_profiles cp WHERE cp.user_id = v_user.id
      )
    );
  ELSIF v_user.role = 'STUDENT'::talent_pool_role THEN
    result := jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'role', v_user.role,
      'status', v_user.status,
      'registration_status', v_user.registration_status,
      'created_at', v_user.created_at,
      'updated_at', v_user.updated_at,
      'student_profiles', (
        SELECT COALESCE(jsonb_agg(to_jsonb(sp)), '[]'::jsonb)
        FROM public.student_profiles sp WHERE sp.user_id = v_user.id
      )
    );
  ELSE
    result := to_jsonb(v_user) - 'password_hash';
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.talent_pool_get_user_with_profile(uuid) TO anon, authenticated;