-- ============================================================================
-- CRM scheduled sync — the "always running" piece.
--
-- pg_cron fires crm_trigger_sync() every 3 minutes; that function calls the
-- crm-sync edge function over HTTP (pg_net) with a shared secret header. Because
-- this runs inside Supabase's cloud, mail keeps syncing with no PC involved.
--
-- After deploying, populate crm_private_config (see DEPLOY notes) with:
--   ('sync_url',    'https://<project-ref>.supabase.co/functions/v1/crm-sync')
--   ('cron_secret', '<same value as the CRM_CRON_SECRET function secret>')
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Private config the cron job reads (never exposed to clients).
CREATE TABLE IF NOT EXISTS public.crm_private_config (
  key   TEXT PRIMARY KEY,
  value TEXT
);
ALTER TABLE public.crm_private_config ENABLE ROW LEVEL SECURITY;
-- No policies → only the service role / SECURITY DEFINER functions can read it.

-- Posts to the crm-sync edge function. SECURITY DEFINER so the cron role can
-- read the private config. No-ops quietly until the config is populated.
CREATE OR REPLACE FUNCTION public.crm_trigger_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url    TEXT;
  v_secret TEXT;
BEGIN
  SELECT value INTO v_url    FROM public.crm_private_config WHERE key = 'sync_url';
  SELECT value INTO v_secret FROM public.crm_private_config WHERE key = 'cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN;  -- not configured yet
  END IF;

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-crm-cron-secret', v_secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
END;
$$;

-- Schedule every 3 minutes (unschedule first so re-running the migration is safe).
DO $$
BEGIN
  PERFORM cron.unschedule('crm-sync-every-3min')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'crm-sync-every-3min');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule('crm-sync-every-3min', '*/3 * * * *', $$ SELECT public.crm_trigger_sync(); $$);
