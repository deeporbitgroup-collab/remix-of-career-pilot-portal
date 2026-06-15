-- Fix security issues: Set search_path for all functions
ALTER FUNCTION public.handle_new_user() 
SET search_path = public;

ALTER FUNCTION public.update_updated_at() 
SET search_path = public;