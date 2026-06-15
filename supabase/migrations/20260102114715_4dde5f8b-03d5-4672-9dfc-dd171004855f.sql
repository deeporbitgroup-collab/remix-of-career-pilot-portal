-- Add university_2 field to profiles table for associates who transferred universities
ALTER TABLE public.profiles
ADD COLUMN university_2 TEXT;