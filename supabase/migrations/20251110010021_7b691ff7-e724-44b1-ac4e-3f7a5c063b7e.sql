-- Add professional metadata columns to profiles table for associates
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS profile_status JSONB DEFAULT '{"university_student": false, "master_student": false, "professional": false}'::jsonb,
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS master_program TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT,
ADD COLUMN IF NOT EXISTS professional_experiences JSONB DEFAULT '[]'::jsonb;

-- Add comment to clarify the structure
COMMENT ON COLUMN public.profiles.profile_status IS 'JSON object with keys: university_student, master_student, professional (all boolean)';
COMMENT ON COLUMN public.profiles.professional_experiences IS 'Array of experience objects with keys: id, company, role, sector, period';