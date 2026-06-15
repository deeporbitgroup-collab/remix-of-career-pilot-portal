-- 1) Helper: admin check function without recursion
CREATE OR REPLACE FUNCTION public.is_talent_pool_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.talent_pool_users u
    WHERE u.id = _uid AND u.role = 'ADMIN'::talent_pool_role
  );
$$;

-- 2) Fix talent_pool_users policies to avoid recursion by using the function
DROP POLICY IF EXISTS "Admin can view all users" ON public.talent_pool_users;
DROP POLICY IF EXISTS "Admin can update all users" ON public.talent_pool_users;

CREATE POLICY "Admin can view all users"
ON public.talent_pool_users
FOR SELECT
USING (public.is_talent_pool_admin(auth.uid()));

CREATE POLICY "Admin can update all users"
ON public.talent_pool_users
FOR UPDATE
USING (public.is_talent_pool_admin(auth.uid()))
WITH CHECK (public.is_talent_pool_admin(auth.uid()));

-- 3) Registration function (SECURITY DEFINER) to create user and profile atomically
CREATE OR REPLACE FUNCTION public.talent_pool_register_student(
  _first_name text,
  _last_name text,
  _email text,
  _phone text,
  _linkedin text,
  _password_hash text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Create user
  INSERT INTO public.talent_pool_users(email, password_hash, role, registration_status)
  VALUES (_email, _password_hash, 'STUDENT'::talent_pool_role, 'PENDING'::registration_status)
  RETURNING id INTO v_user_id;

  -- Create profile
  INSERT INTO public.student_profiles(user_id, first_name, last_name, phone, linkedin_url)
  VALUES (v_user_id, _first_name, _last_name, _phone, NULLIF(_linkedin, ''));

  RETURN v_user_id;
END;$$;

-- 4) Function to update student document URLs
CREATE OR REPLACE FUNCTION public.talent_pool_update_student_documents(
  _user_id uuid,
  _cv_url text,
  _cover_url text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.student_profiles
  SET cv_url = _cv_url,
      cover_letter_url = _cover_url,
      updated_at = now()
  WHERE user_id = _user_id;
END;$$;

-- 5) Make CV and Cover buckets public for simple access
UPDATE storage.buckets SET public = true WHERE id IN ('talent-pool-cv','talent-pool-covers');

-- 6) Storage policies: allow public read, authenticated upload
DO $$ BEGIN
  -- READ
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read talent-pool docs'
  ) THEN
    CREATE POLICY "Public read talent-pool docs"
    ON storage.objects
    FOR SELECT
    USING (bucket_id IN ('talent-pool-cv','talent-pool-covers'));
  END IF;

  -- INSERT (any authenticated user)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can upload talent-pool docs'
  ) THEN
    CREATE POLICY "Authenticated can upload talent-pool docs"
    ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id IN ('talent-pool-cv','talent-pool-covers'));
  END IF;
END $$;