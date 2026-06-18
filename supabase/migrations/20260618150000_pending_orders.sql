-- Stripe "tab-close proof" fulfillment staging.
--
-- The client order (projects, slots, emails) is created only AFTER payment. That
-- work can run from two places: the payment-success page (fast, for the user) OR a
-- Stripe webhook (server-to-server, fires even if the user closed the tab). To make
-- sure the order is created EXACTLY ONCE regardless of who arrives first, the
-- fulfillment payload is staged here keyed by the Stripe session id, and both paths
-- take an atomic claim before doing the work.

CREATE TABLE IF NOT EXISTS public.pending_orders (
  session_id   TEXT PRIMARY KEY,          -- Stripe checkout session id
  client_id    UUID,
  payload      JSONB NOT NULL,            -- serialized PendingClientOrder
  status       TEXT NOT NULL DEFAULT 'pending', -- pending | processing | fulfilled
  order_id     UUID,                      -- set once the order is created
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ
);

ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Permissive policy (mirrors the existing client_* tables in this project). The row
-- only holds checkout staging data (service/associate ids, proposed slots) and the
-- mutating operations all go through the SECURITY DEFINER RPCs below.
DROP POLICY IF EXISTS "pending_orders all" ON public.pending_orders;
CREATE POLICY "pending_orders all" ON public.pending_orders
  FOR ALL USING (true) WITH CHECK (true);

-- ── Atomic claim ────────────────────────────────────────────────────────────
-- Flip pending → processing and return the row ONLY to the caller that won the
-- race. A "processing" row older than 5 min can be re-claimed (covers a crash
-- mid-fulfillment, e.g. the browser died — the Stripe webhook retries for days).
CREATE OR REPLACE FUNCTION public.claim_pending_order(_session_id text)
RETURNS public.pending_orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r public.pending_orders;
BEGIN
  UPDATE public.pending_orders
  SET status = 'processing', updated_at = now()
  WHERE session_id = _session_id
    AND (status = 'pending'
         OR (status = 'processing' AND updated_at < now() - interval '5 minutes'))
  RETURNING * INTO r;

  RETURN r; -- all-NULL row when not claimed (already fulfilled or being processed)
END;
$function$;

-- Mark a claimed order as fulfilled, recording the created order id.
CREATE OR REPLACE FUNCTION public.complete_pending_order(_session_id text, _order_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.pending_orders
  SET status = 'fulfilled', order_id = _order_id, fulfilled_at = now(), updated_at = now()
  WHERE session_id = _session_id;
$function$;

-- Release a claim back to pending if fulfillment failed, so the other path / a
-- Stripe webhook retry can pick it up.
CREATE OR REPLACE FUNCTION public.release_pending_order(_session_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  UPDATE public.pending_orders
  SET status = 'pending', updated_at = now()
  WHERE session_id = _session_id AND status = 'processing';
$function$;

GRANT EXECUTE ON FUNCTION public.claim_pending_order(text)            TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.complete_pending_order(text, uuid)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_pending_order(text)          TO anon, authenticated, service_role;
