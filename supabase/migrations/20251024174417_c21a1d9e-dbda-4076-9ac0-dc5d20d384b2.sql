-- Add photo_url column to pathways_users table
ALTER TABLE public.pathways_users 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN public.pathways_users.photo_url IS 'URL of user profile photo stored in talent-pool-photos bucket';