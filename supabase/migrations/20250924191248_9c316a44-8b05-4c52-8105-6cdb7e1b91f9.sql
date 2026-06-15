-- Drop existing duplicate trigger if exists
DROP TRIGGER IF EXISTS prevent_availability_overlap ON availability_slots;

-- Add RPC functions for availability management
CREATE OR REPLACE FUNCTION public.availability_upsert(
  _date date,
  _start time without time zone,
  _end time without time zone,
  _tz text DEFAULT 'UTC'::text,
  _id uuid DEFAULT NULL::uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
  v_overlap boolean;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if _start >= _end then
    raise exception 'start_time must be before end_time';
  end if;

  select exists(
    select 1
    from public.availability_slots s
    where s.user_id = v_uid
      and s.date = _date
      and (_id is null or s.id <> _id)
      and s.start_time < _end
      and s.end_time > _start
  ) into v_overlap;

  if v_overlap then
    raise exception 'overlap with existing slot';
  end if;

  if _id is null then
    insert into public.availability_slots (user_id, date, start_time, end_time, timezone)
    values (v_uid, _date, _start, _end, coalesce(_tz,'UTC'))
    returning id into v_id;
  else
    update public.availability_slots
      set date = _date,
          start_time = _start,
          end_time = _end,
          timezone = coalesce(_tz,'UTC'),
          updated_at = now()
    where id = _id and user_id = v_uid
    returning id into v_id;

    if v_id is null then
      raise exception 'slot not found';
    end if;
  end if;

  return v_id;
end $$;

-- Create RPC function for deleting availability
CREATE OR REPLACE FUNCTION public.availability_delete(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
begin
  delete from public.availability_slots
  where id = _id and user_id = auth.uid();
end $$;