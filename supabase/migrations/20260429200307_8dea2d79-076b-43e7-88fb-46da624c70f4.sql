-- Backfill active_associate_id for existing projects (set to primary associate)
UPDATE public.client_projects
SET active_associate_id = associate_id
WHERE active_associate_id IS NULL AND associate_id IS NOT NULL;

-- Backfill scheduling_status for existing projects without one
UPDATE public.client_projects
SET scheduling_status = 'awaiting_primary'
WHERE scheduling_status IS NULL;

-- Backfill associate_id and slot_role on existing meeting slots (assume they belong to project's primary)
UPDATE public.client_meeting_slots cms
SET associate_id = cp.associate_id,
    slot_role = COALESCE(cms.slot_role, 'client_for_primary')
FROM public.client_projects cp
WHERE cms.project_id = cp.id
  AND cms.associate_id IS NULL
  AND cp.associate_id IS NOT NULL;

-- Ensure slot_role default is set for any leftover rows
UPDATE public.client_meeting_slots
SET slot_role = 'client_for_primary'
WHERE slot_role IS NULL;