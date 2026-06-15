-- Add additional_call_reason column to client_projects table
ALTER TABLE public.client_projects
ADD COLUMN IF NOT EXISTS additional_call_reason TEXT;