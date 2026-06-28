-- Outreach Power Pack — mandatory free check-in.
--
-- The Outreach Power Pack is pay-per-interview (€250 only when an interview is
-- secured) — so it is NEVER charged at checkout. Instead, when the client adds it
-- (single product or package add-on) they must book a FREE check-in with the team,
-- who explains how it works and which sectors/cities to target. The client proposes
-- 3 time slots; an ADMIN confirms one. Emails fire automatically on request + confirm.

CREATE TABLE IF NOT EXISTS public.outreach_checkins (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      UUID,                       -- set when the requester is a logged-in client
  guest_name     TEXT NOT NULL,
  guest_email    TEXT NOT NULL,
  sectors        TEXT,                        -- sectors of interest (optional)
  cities         TEXT,                        -- cities of interest (optional)
  proposed_slots JSONB NOT NULL,              -- [{ "date": "yyyy-MM-dd", "time": "HH:mm-HH:mm" }, ...]
  status         TEXT NOT NULL DEFAULT 'requested', -- requested | confirmed | cancelled | completed
  confirmed_slot TEXT,                         -- the slot the admin picked ("yyyy-MM-dd HH:mm-HH:mm")
  confirmed_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_checkins ENABLE ROW LEVEL SECURITY;

-- Permissive policy, mirroring the other client_* tables in this project. The client
-- portal uses the anon key (custom auth), and the mutating paths go through the
-- outreach-checkin edge function (service role).
DROP POLICY IF EXISTS "outreach_checkins all" ON public.outreach_checkins;
CREATE POLICY "outreach_checkins all" ON public.outreach_checkins
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_outreach_checkins_client ON public.outreach_checkins (client_id);
CREATE INDEX IF NOT EXISTS idx_outreach_checkins_email  ON public.outreach_checkins (guest_email);
CREATE INDEX IF NOT EXISTS idx_outreach_checkins_status ON public.outreach_checkins (status);

-- Realtime so the admin queue and the client status update live.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.outreach_checkins;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
