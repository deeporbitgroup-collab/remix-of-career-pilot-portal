-- Create table for announcement recipients (specific users)
CREATE TABLE IF NOT EXISTS public.announcement_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS on announcement_recipients
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;

-- Policy for admins to manage recipients
CREATE POLICY "Admins can manage announcement recipients"
ON public.announcement_recipients
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'::user_role 
    AND profiles.status = 'approved'::user_status
  )
);

-- Policy for users to view recipients of announcements they can see
CREATE POLICY "Users can view recipients of their announcements"
ON public.announcement_recipients
FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN'::user_role 
    AND profiles.status = 'approved'::user_status
  )
);

-- Drop existing policies on announcements table
DROP POLICY IF EXISTS "Associates can view announcements for them" ON public.announcements;
DROP POLICY IF EXISTS "Partners can view announcements for them" ON public.announcements;

-- Create updated policies for announcements with specific recipients support
CREATE POLICY "Associates can view announcements for them"
ON public.announcements
FOR SELECT
USING (
  active = true
  AND (target_audience = ANY(ARRAY['ASSOCIATE', 'BOTH']))
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ASSOCIATE'::user_role 
    AND profiles.status = 'approved'::user_status
  )
  AND (
    -- No specific recipients means it's for everyone
    NOT EXISTS (SELECT 1 FROM announcement_recipients WHERE announcement_id = announcements.id)
    -- Or user is a specific recipient
    OR EXISTS (
      SELECT 1 FROM announcement_recipients 
      WHERE announcement_id = announcements.id 
      AND user_id = auth.uid()
    )
  )
);

CREATE POLICY "Partners can view announcements for them"
ON public.announcements
FOR SELECT
USING (
  active = true
  AND (target_audience = ANY(ARRAY['PARTNER', 'BOTH']))
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'PARTNER'::user_role 
    AND profiles.status = 'approved'::user_status
  )
  AND (
    -- No specific recipients means it's for everyone
    NOT EXISTS (SELECT 1 FROM announcement_recipients WHERE announcement_id = announcements.id)
    -- Or user is a specific recipient
    OR EXISTS (
      SELECT 1 FROM announcement_recipients 
      WHERE announcement_id = announcements.id 
      AND user_id = auth.uid()
    )
  )
);