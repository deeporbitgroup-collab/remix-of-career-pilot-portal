-- Block C2.1 — meeting proposal/counter support on recruiting_meetings.
--
-- proposed_by tracks WHO made the currently-pending proposal, so we know whose
-- turn it is: COMPANY proposed -> student responds; STUDENT countered -> company
-- responds. (created_by from C1 is fixed = the meeting's creator; we need a
-- mutable field that flips on each counter-proposal.)
--
-- description holds the optional meeting description the company/admin adds with
-- the link once the meeting is CONFIRMED.

ALTER TABLE public.recruiting_meetings
  ADD COLUMN IF NOT EXISTS proposed_by text NOT NULL DEFAULT 'COMPANY',
  ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.recruiting_meetings
  DROP CONSTRAINT IF EXISTS recruiting_meetings_proposed_by_check;
ALTER TABLE public.recruiting_meetings
  ADD CONSTRAINT recruiting_meetings_proposed_by_check
  CHECK (proposed_by IN ('COMPANY', 'STUDENT'));
