-- 1) Helper function to check if a UUID belongs to a STUDENT in talent_pool_users
CREATE OR REPLACE FUNCTION public.tp_is_student(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.talent_pool_users u
    WHERE u.id = _uid
      AND u.role = 'STUDENT'::talent_pool_role
  );
$$;

-- 2) Replace INSERT policy to use the security definer function
DROP POLICY IF EXISTS "Students can upload their receipts" ON public.talent_pool_payment_receipts;
DROP POLICY IF EXISTS "Students can upload receipts" ON public.talent_pool_payment_receipts;

CREATE POLICY "Students can upload their receipts"
ON public.talent_pool_payment_receipts
FOR INSERT
WITH CHECK (public.tp_is_student(user_id));