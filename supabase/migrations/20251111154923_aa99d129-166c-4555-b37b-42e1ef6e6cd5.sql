-- Allow public read access to approved associates in profiles table
-- This is needed for the client portal to show available associates
-- when clients are not authenticated via Supabase Auth

CREATE POLICY "Anyone can view approved associates"
ON profiles
FOR SELECT
USING (
  role = 'ASSOCIATE' 
  AND status = 'approved'
);