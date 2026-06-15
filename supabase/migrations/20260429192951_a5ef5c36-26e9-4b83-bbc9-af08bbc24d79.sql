
ALTER TABLE public.client_projects
  ADD COLUMN IF NOT EXISTS backup_associate_id uuid,
  ADD COLUMN IF NOT EXISTS active_associate_id uuid,
  ADD COLUMN IF NOT EXISTS scheduling_status text DEFAULT 'awaiting_primary',
  ADD COLUMN IF NOT EXISTS primary_declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS backup_activated_at timestamptz;

ALTER TABLE public.client_meeting_slots
  ADD COLUMN IF NOT EXISTS associate_id uuid,
  ADD COLUMN IF NOT EXISTS slot_role text DEFAULT 'client_for_primary',
  ADD COLUMN IF NOT EXISTS proposed_date date;

CREATE INDEX IF NOT EXISTS idx_client_projects_backup_associate
  ON public.client_projects(backup_associate_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_active_associate
  ON public.client_projects(active_associate_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_slots_associate
  ON public.client_meeting_slots(associate_id);
CREATE INDEX IF NOT EXISTS idx_client_meeting_slots_role
  ON public.client_meeting_slots(project_id, slot_role);
