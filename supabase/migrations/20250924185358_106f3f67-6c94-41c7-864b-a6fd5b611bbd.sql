-- Aggiorno la tabella availability_slots per aggiungere timezone
ALTER TABLE public.availability_slots 
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Rome';

-- Aggiungo indice per performance
CREATE INDEX IF NOT EXISTS idx_availability_slots_user_date 
ON public.availability_slots(user_id, date);

-- Rimuovo constraint esistente se presente
ALTER TABLE public.availability_slots
DROP CONSTRAINT IF EXISTS check_time_order;

-- Aggiungo constraint per validazione orari
ALTER TABLE public.availability_slots
ADD CONSTRAINT check_time_order 
CHECK (start_time < end_time);

-- Funzione per verificare sovrapposizioni
CREATE OR REPLACE FUNCTION check_availability_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM availability_slots
    WHERE user_id = NEW.user_id
    AND date = NEW.date
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
      (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Slot overlaps with existing availability';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Rimuovo trigger esistente se presente
DROP TRIGGER IF EXISTS prevent_availability_overlap ON availability_slots;

-- Trigger per prevenire sovrapposizioni
CREATE TRIGGER prevent_availability_overlap
BEFORE INSERT OR UPDATE ON availability_slots
FOR EACH ROW
EXECUTE FUNCTION check_availability_overlap();