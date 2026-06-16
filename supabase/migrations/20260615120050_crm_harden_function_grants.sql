-- ============================================================================
-- CRM hardening — restrict the SECURITY DEFINER helpers.
--
-- By Postgres default these functions are EXECUTE-able by PUBLIC (so anon /
-- authenticated can call them via /rest/v1/rpc). The mutating ones bypass RLS,
-- so they must be callable only by the service role (edge functions / cron).
-- crm_counts is switched to SECURITY INVOKER so a non-admin caller just sees
-- zeros (RLS hides the rows) instead of real aggregates.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.crm_recompute_rollups()      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_resurface_archived()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_auto_archive_bounces()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_apply_calls(jsonb)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.crm_upsert_contacts(jsonb)   FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.crm_recompute_rollups()       TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_resurface_archived()      TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_auto_archive_bounces()    TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_apply_calls(jsonb)        TO service_role;
GRANT EXECUTE ON FUNCTION public.crm_upsert_contacts(jsonb)    TO service_role;

ALTER FUNCTION public.crm_counts() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.crm_counts() FROM anon;

-- Pin search_path on the one remaining pure helper (clears the advisor WARN).
CREATE OR REPLACE FUNCTION public.crm_is_bot(_email TEXT)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT _email LIKE 'postmaster%'  OR _email LIKE 'mailer-daemon%'
      OR _email LIKE 'mail-daemon%' OR _email LIKE 'no-reply%'
      OR _email LIKE 'noreply%'     OR _email LIKE 'no_reply%'
      OR _email LIKE 'donotreply%'  OR _email LIKE 'do-not-reply%'
      OR _email LIKE 'notifications@%' OR _email LIKE 'notification@%'
      OR _email LIKE 'newsletter%'  OR _email LIKE 'news@%'
      OR _email LIKE 'alerts@%'     OR _email LIKE 'alert@%'
      OR _email LIKE 'updates@%'    OR _email LIKE 'billing@%'
      OR _email LIKE 'receipts@%';
$$;
