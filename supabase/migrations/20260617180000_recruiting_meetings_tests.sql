-- Block C1 — recruiting flow foundation for the company ↔ student journey.
--
-- A selected candidate can have MANY meetings and MANY tests (e.g. first interview
-- + technical interview, or several tests). So meetings/tests are LISTS in their own
-- tables, not single states. company_selected_students keeps only a coarse high-level
-- `stage` for the badge/filters.
--
-- History is PRESERVED across a deselect: the deselect flow deletes the
-- company_selected_students row, so meetings/tests are anchored by (company_id,
-- student_id) — NOT by a FK with ON DELETE CASCADE — so the recruiting history
-- survives a deselect (and re-attaches if the company re-selects the candidate).

-- 1) High-level stage on the selection (badge / filters only).
ALTER TABLE public.company_selected_students
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'IN_PROGRESS',
  ADD COLUMN IF NOT EXISTS stage_updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.company_selected_students
  DROP CONSTRAINT IF EXISTS company_selected_students_stage_check;
ALTER TABLE public.company_selected_students
  ADD CONSTRAINT company_selected_students_stage_check
  CHECK (stage IN ('IN_PROGRESS', 'OFFER', 'REJECTED', 'HIRED'));

-- 2) Meetings (N per candidate) — anchored by the company/student pair, no cascade.
CREATE TABLE IF NOT EXISTS public.recruiting_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,            -- talent_pool_users.id (company)
  student_id uuid NOT NULL,            -- talent_pool_users.id (student)
  title text,
  proposed_slots jsonb NOT NULL DEFAULT '[]'::jsonb,  -- [{ datetime, label? }]
  timezone text,                       -- tz label shown next to the times (no auto-conversion)
  confirmed_slot jsonb,                -- the slot the student accepted
  meet_link text,
  status text NOT NULL DEFAULT 'PROPOSED'
    CHECK (status IN ('PROPOSED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED')),
  outcome text,
  created_by text NOT NULL DEFAULT 'COMPANY'
    CHECK (created_by IN ('COMPANY', 'STUDENT', 'ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recruiting_meetings_pair
  ON public.recruiting_meetings (company_id, student_id);

-- 3) Tests (N per candidate) — same anchoring.
CREATE TABLE IF NOT EXISTS public.recruiting_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  student_id uuid NOT NULL,
  title text,
  instructions text,
  link text,
  due_at timestamptz,
  timezone text,                       -- tz label shown next to the deadline
  status text NOT NULL DEFAULT 'SENT'
    CHECK (status IN ('SENT', 'SUBMITTED', 'PASSED', 'FAILED', 'CANCELLED')),
  outcome text,
  created_by text NOT NULL DEFAULT 'COMPANY'
    CHECK (created_by IN ('COMPANY', 'STUDENT', 'ADMIN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recruiting_tests_pair
  ON public.recruiting_tests (company_id, student_id);

-- 4) RLS: enabled, deny-by-default. Talent Pool users have no auth.uid(), so all
--    reads/writes go through service-role edge functions (C2–C4). No public policies.
ALTER TABLE public.recruiting_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiting_tests ENABLE ROW LEVEL SECURITY;
