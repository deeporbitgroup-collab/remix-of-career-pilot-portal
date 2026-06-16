-- ============================================================================
-- Fix: pg-safeupdate (active on the PostgREST/service_role connection that
-- crm-sync uses) rejects UPDATE/DELETE without a WHERE clause with:
--   "UPDATE requires a WHERE clause" / "DELETE requires a WHERE clause"
--
-- Two ported helpers had unqualified statements, so they silently failed when
-- called via RPC from the edge function (they worked fine when run directly as
-- the postgres role, which has no safeupdate hook — hence the confusion):
--   • crm_recompute_rollups: DELETE FROM crm_threads;   (rebuild)
--   • crm_apply_calls:        UPDATE crm_contacts SET next/last_call = NULL;
--
-- Result was every contact stuck on "no_reply" (rollup never ran) and calls
-- never applied (scheduled/completed always 0). Add explicit WHERE clauses.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.crm_recompute_rollups()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.crm_threads WHERE true;
  INSERT INTO public.crm_threads (thread_id, contact_email, subject, last_ts, last_direction)
  SELECT thread_id, contact_email, subject, ts, direction FROM (
    SELECT thread_id, contact_email, subject, ts, direction,
           ROW_NUMBER() OVER (PARTITION BY thread_id ORDER BY ts DESC) AS rn
    FROM public.crm_messages
  ) s WHERE rn = 1;

  UPDATE public.crm_contacts c SET
    last_message_at = s.last_ts,
    last_direction  = s.last_dir,
    replied         = s.any_in
  FROM (
    SELECT contact_email, ts AS last_ts, direction AS last_dir, any_in
    FROM (
      SELECT contact_email, ts, direction,
             ROW_NUMBER() OVER (PARTITION BY contact_email ORDER BY ts DESC) AS rn,
             MAX(CASE WHEN direction = 'in' THEN 1 ELSE 0 END)
                 OVER (PARTITION BY contact_email) AS any_in
      FROM public.crm_messages
    ) x WHERE rn = 1
  ) s
  WHERE c.email = s.contact_email;
END;
$$;

CREATE OR REPLACE FUNCTION public.crm_apply_calls(_calls jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE k text; v jsonb;
BEGIN
  UPDATE public.crm_contacts SET next_call_at = NULL, last_call_at = NULL
    WHERE next_call_at IS NOT NULL OR last_call_at IS NOT NULL;
  FOR k, v IN SELECT key, value FROM jsonb_each(_calls) LOOP
    UPDATE public.crm_contacts SET
      next_call_at = NULLIF(v->>'next','')::bigint,
      last_call_at = NULLIF(v->>'last','')::bigint
    WHERE email = lower(k);
  END LOOP;
END;
$$;
