-- Add overview_url column for the Overview PDF document
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS overview_url TEXT DEFAULT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.profiles.overview_url IS 'URL to the Overview PDF document for associates, uploaded by admin';