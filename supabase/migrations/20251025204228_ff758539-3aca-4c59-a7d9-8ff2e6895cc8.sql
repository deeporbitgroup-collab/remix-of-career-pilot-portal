-- Add a new RLS policy to allow public read access to visible student profiles
-- This is safe because we only expose name, surname, photo, CV and cover letter for explicitly visible students

CREATE POLICY "Public can view visible student profiles"
ON public.student_profiles
FOR SELECT
USING (profile_visible_to_companies = true);