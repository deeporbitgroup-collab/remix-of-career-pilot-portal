-- Pay-after-confirmation flow.
--
-- BEFORE: the client paid at checkout; the order/projects/slots were created only
-- AFTER Stripe confirmed payment (pending_orders staging + fulfillClientOrder).
--
-- NOW: the order(s), projects and meeting slots are created at checkout in an
-- UNPAID state so the Associate can see the request and confirm a meeting time.
-- Payment is collected only AFTER that confirmation. Payments are grouped by
-- Associate: each Associate's bundle of services becomes its OWN client_orders row
-- (plus one "immediate" order for services with no associate/meeting, which is paid
-- right away at checkout, as before).
--
-- We deliberately reuse client_orders as the "payment group" (it already has an
-- associate_id and a payment_status) instead of adding a separate table — fewer new
-- concepts, and the existing per-order badges/queries keep working.

-- ── client_orders: payment-group metadata ───────────────────────────────────
ALTER TABLE public.client_orders
  ADD COLUMN IF NOT EXISTS checkout_group_id UUID,        -- ties sibling orders created in the same checkout
  ADD COLUMN IF NOT EXISTS kind              TEXT NOT NULL DEFAULT 'associate', -- 'immediate' | 'associate'
  ADD COLUMN IF NOT EXISTS order_label       TEXT,        -- human label, e.g. "Take Off — Marco Rossi"
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,        -- last Stripe Checkout session created for this order
  ADD COLUMN IF NOT EXISTS unlocked_at       TIMESTAMPTZ, -- when the associate confirmed → payment became due
  ADD COLUMN IF NOT EXISTS paid_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_reason  TEXT;

COMMENT ON COLUMN public.client_orders.kind IS
  'immediate = no associate/meeting, paid at checkout; associate = paid after the associate confirms the meeting time';

-- payment_status now uses this lifecycle (TEXT, not an enum, to stay flexible):
--   immediate order:  'awaiting_payment' -> 'paid'
--   associate order:  'awaiting_confirmation' -> 'awaiting_payment' -> 'paid'
--   either:           -> 'cancelled' (admin cancels an unpaid reservation)
-- Legacy rows used 'pending'/'verified'; those keep working (treated as paid where relevant).

-- Backfill: every existing order predates this flow and was paid at checkout.
UPDATE public.client_orders
SET kind = 'immediate'
WHERE kind IS NULL OR kind = 'associate';
-- (existing rows already carry their real payment_status: 'paid'/'pending'/etc.)

CREATE INDEX IF NOT EXISTS idx_client_orders_checkout_group ON public.client_orders (checkout_group_id);
CREATE INDEX IF NOT EXISTS idx_client_orders_payment_status ON public.client_orders (payment_status);

-- ── client_services: which services are stand-alone "calls" ──────────────────
-- Associate Office Hours and Expert Career Session are CALLS (each its own meeting).
-- Everything else delivered by an associate is presented inside Meeting 1.
-- (Used by the Phase-2 staggered-calls scheduling; harmless and useful to set now.)
ALTER TABLE public.client_services
  ADD COLUMN IF NOT EXISTS is_call_service BOOLEAN NOT NULL DEFAULT false;

UPDATE public.client_services
SET is_call_service = true
WHERE name IN ('Associate Office Hours', 'Expert Career Session');

-- ── Atomic helpers (SECURITY DEFINER) ────────────────────────────────────────
-- Unlock an associate order for payment exactly once, when the meeting is confirmed.
-- Returns true only the first time (so we send the "payment due" email once).
CREATE OR REPLACE FUNCTION public.unlock_order_payment(_order_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  did_unlock boolean := false;
BEGIN
  UPDATE public.client_orders
  SET payment_status = 'awaiting_payment',
      unlocked_at = now(),
      updated_at = now()
  WHERE id = _order_id
    AND kind = 'associate'
    AND payment_status = 'awaiting_confirmation';
  GET DIAGNOSTICS did_unlock = ROW_COUNT;
  RETURN did_unlock;
END;
$function$;

-- Mark an order paid exactly once. Returns true only on the transition to paid
-- (so confirmation emails fire once, whether triggered by verify-payment or webhook).
CREATE OR REPLACE FUNCTION public.mark_client_order_paid(_order_id uuid, _stripe_session text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  did_pay boolean := false;
BEGIN
  UPDATE public.client_orders
  SET payment_status = 'paid',
      paid_at = now(),
      stripe_session_id = COALESCE(_stripe_session, stripe_session_id),
      payment_receipt_url = COALESCE(payment_receipt_url, 'stripe:' || COALESCE(_stripe_session, '')),
      updated_at = now()
  WHERE id = _order_id
    AND payment_status <> 'paid';
  GET DIAGNOSTICS did_pay = ROW_COUNT;
  RETURN did_pay;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.unlock_order_payment(uuid)            TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_client_order_paid(uuid, text)    TO anon, authenticated, service_role;

-- Realtime: let the client dashboard react the moment an order's payment_status
-- changes (banner appears on confirmation, disappears once paid). Guarded so the
-- migration is safe whether or not the table/publication already exist.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.client_orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already in the publication
  WHEN undefined_object THEN NULL;  -- publication doesn't exist in this env
END $$;
