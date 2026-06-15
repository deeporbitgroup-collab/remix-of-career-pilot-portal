-- Add brief_overview column to client_users table to store the Brief Overview form data
ALTER TABLE public.client_users 
ADD COLUMN IF NOT EXISTS brief_overview JSONB DEFAULT NULL;