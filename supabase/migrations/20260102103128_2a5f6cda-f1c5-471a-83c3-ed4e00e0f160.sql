-- Add sector_2 and company_2 fields to profiles table for associates
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS sector_2 text,
ADD COLUMN IF NOT EXISTS company_2 text;