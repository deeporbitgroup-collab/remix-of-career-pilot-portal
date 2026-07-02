-- Remove the dead "Active Recruiting" (direct-table chat/documents) feature.
-- These tables were gated by Supabase Auth RLS (auth.uid()), but the Talent
-- Pool uses custom localStorage auth with no auth session, so every write was
-- silently rejected: all three tables held 0 rows and the feature never worked.
-- The frontend components and the two dead edge functions have been removed;
-- the newer meeting/test/offer flow (service-role edge functions) supersedes it.

DROP TABLE IF EXISTS public.recruiting_documents CASCADE;
DROP TABLE IF EXISTS public.recruiting_messages CASCADE;
DROP TABLE IF EXISTS public.recruiting_processes CASCADE;

DROP TYPE IF EXISTS public.recruiting_next_step;
DROP TYPE IF EXISTS public.recruiting_status;
