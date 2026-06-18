-- ============================================================================
-- Admin Tasks — a native in-app task board for the Crew Portal admin area.
--
-- Replaces the old "Shared Resources Library" Dropbox shortcut in the admin
-- Extensions card: the tile now opens this internal board directly. A simple
-- three-column kanban (To do / In progress / Done) persisted in Postgres.
--
-- Access: restricted by RLS to approved ADMIN profiles, reusing the existing
-- crm_is_admin() guard (role = 'ADMIN' AND status = 'approved'). The crew
-- portal uses Supabase Auth, so auth.uid()-based RLS applies cleanly here.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.admin_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  notes        TEXT NOT NULL DEFAULT '',
  assignee     TEXT NOT NULL DEFAULT '',           -- free-text owner label
  status       TEXT NOT NULL DEFAULT 'todo',        -- 'todo' | 'doing' | 'done'
  priority     INTEGER NOT NULL DEFAULT 0,          -- 0 = normal, 1 = high
  due_date     DATE,
  position     INTEGER NOT NULL DEFAULT 0,          -- manual ordering within a column
  created_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT admin_tasks_status_chk CHECK (status IN ('todo', 'doing', 'done'))
);

CREATE INDEX IF NOT EXISTS idx_admin_tasks_status ON public.admin_tasks(status, position);

-- Keep updated_at / completed_at consistent on every write.
CREATE OR REPLACE FUNCTION public.admin_tasks_touch()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status = 'done' AND (OLD.status IS DISTINCT FROM 'done') THEN
    NEW.completed_at := now();
  ELSIF NEW.status <> 'done' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_tasks_touch ON public.admin_tasks;
CREATE TRIGGER trg_admin_tasks_touch
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.admin_tasks_touch();

-- Row Level Security: approved ADMINs only (service role bypasses RLS).
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_tasks_admin_all ON public.admin_tasks;
CREATE POLICY admin_tasks_admin_all ON public.admin_tasks
  FOR ALL USING (public.crm_is_admin()) WITH CHECK (public.crm_is_admin());
