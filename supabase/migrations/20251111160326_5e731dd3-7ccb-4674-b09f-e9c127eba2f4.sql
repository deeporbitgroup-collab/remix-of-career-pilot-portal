-- Add CV and LinkedIn columns to profiles table for associates
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS cv_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT;

-- Add comment to explain these fields
COMMENT ON COLUMN public.profiles.cv_url IS 'URL to the associate CV stored in Supabase storage';
COMMENT ON COLUMN public.profiles.linkedin_url IS 'LinkedIn profile URL for the associate';