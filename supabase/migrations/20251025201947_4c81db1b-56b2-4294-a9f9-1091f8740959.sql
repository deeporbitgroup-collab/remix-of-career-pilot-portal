-- 1) Add approval metadata to talent_pool_users and backfill
DO $$
BEGIN
  -- Add columns if they don't exist (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'talent_pool_users' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE public.talent_pool_users
      ADD COLUMN approved_at TIMESTAMPTZ NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'talent_pool_users' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE public.talent_pool_users
      ADD COLUMN approved_by UUID NULL;
  END IF;

  -- Backfill legacy/null statuses to PENDING to ensure consistency
  UPDATE public.talent_pool_users
  SET registration_status = 'PENDING'
  WHERE registration_status IS NULL;
END $$;

-- 2) Helper function for admin approval/rejection (SECURITY DEFINER) used by Edge Function if needed
CREATE OR REPLACE FUNCTION public.tp_set_company_status(
  _company_id uuid,
  _new_status registration_status,
  _admin_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status registration_status;
BEGIN
  -- Get old status
  SELECT registration_status INTO v_old_status
  FROM public.talent_pool_users
  WHERE id = _company_id AND role = 'COMPANY';

  -- Update status + metadata
  UPDATE public.talent_pool_users
  SET 
    registration_status = _new_status,
    approved_at = CASE WHEN _new_status = 'APPROVED' THEN NOW() ELSE approved_at END,
    approved_by = CASE WHEN _new_status = 'APPROVED' THEN _admin_id ELSE approved_by END,
    updated_at = NOW()
  WHERE id = _company_id AND role = 'COMPANY';

  -- Log the action
  INSERT INTO public.talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    _admin_id,
    CASE WHEN _new_status = 'APPROVED' THEN 'COMPANY_APPROVED'
         WHEN _new_status = 'REJECTED' THEN 'COMPANY_REJECTED'
         ELSE 'COMPANY_STATUS_UPDATED' END,
    'USER',
    _company_id,
    jsonb_build_object('old_status', v_old_status, 'new_status', _new_status)
  );
END;$$;
