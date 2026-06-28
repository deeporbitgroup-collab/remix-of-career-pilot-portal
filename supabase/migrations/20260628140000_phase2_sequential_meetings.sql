-- Phase 2 — sequential package meetings.
--
-- A package (one associate group) is delivered as a SEQUENCE of meetings:
--   • Meeting 1 (kickoff): the single meeting that presents all the non-call
--     deliverables of the group. Scheduled at checkout (client proposes 3 slots).
--     Confirming it is what unlocks payment (Phase 1).
--   • Calls (is_call_service = true: Associate Office Hours, Expert Career Session):
--     one meeting EACH, happening AFTER Meeting 1, proposed by the ASSOCIATE one at a
--     time. After a meeting is completed the associate proposes the next call's slots;
--     the client accepts one. Each call lasts max 1 hour.
--
-- We model this on the existing per-component client_projects rather than a new table:
-- each project carries its place in the sequence and whether it's the kickoff.

ALTER TABLE public.client_projects
  ADD COLUMN IF NOT EXISTS is_kickoff          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS call_sequence       INTEGER,        -- 1,2,3… order of the call within its group (null = kickoff/deliverable)
  ADD COLUMN IF NOT EXISTS meeting_completed_at TIMESTAMPTZ;    -- set when the associate marks this meeting done

COMMENT ON COLUMN public.client_projects.is_kickoff IS
  'Meeting 1 anchor for the order group: the project that carries the kickoff meeting scheduling.';
COMMENT ON COLUMN public.client_projects.call_sequence IS
  'Order of a follow-up call within its associate group (1 = first call after kickoff). NULL for the kickoff and for non-call deliverables.';

-- scheduling_status gains these string values (no enum to alter):
--   'covered_by_kickoff'        — a deliverable presented inside Meeting 1 (no own meeting)
--   'locked_until_previous'     — a call not yet schedulable (waiting for the previous meeting)
--   'awaiting_associate_proposal' — the associate should now propose 3 slots for this call
--   'associate_proposed'        — associate proposed 3 slots, waiting for the client to pick
-- (existing: 'awaiting_primary','primary_proposed_new','awaiting_backup','confirmed','no_meeting_requested')

-- client_meeting_slots.slot_role gains 'associate_for_client' (associate proposing a
-- follow-up call's times to the client) alongside the existing roles.

CREATE INDEX IF NOT EXISTS idx_client_projects_group_sequence
  ON public.client_projects (order_id, call_sequence);
