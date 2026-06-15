-- Add photo_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create profile-photos storage bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for profile-photos bucket
CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Profile photos are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'profile-photos');

-- Create group chats table
CREATE TABLE IF NOT EXISTS public.group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;

-- Create group chat members table
CREATE TABLE IF NOT EXISTS public.group_chat_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_chat_id, user_id)
);

ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;

-- Create group chat messages table
CREATE TABLE IF NOT EXISTS public.group_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_chat_id UUID NOT NULL REFERENCES public.group_chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false
);

ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_chats
CREATE POLICY "Admins can manage group chats"
ON public.group_chats FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'::user_role
    AND profiles.status = 'approved'::user_status
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'::user_role
    AND profiles.status = 'approved'::user_status
));

CREATE POLICY "Members can view their group chats"
ON public.group_chats FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.group_chat_members
  WHERE group_chat_members.group_chat_id = group_chats.id
    AND group_chat_members.user_id = auth.uid()
));

-- RLS policies for group_chat_members
CREATE POLICY "Admins can manage group chat members"
ON public.group_chat_members FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'::user_role
    AND profiles.status = 'approved'::user_status
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'::user_role
    AND profiles.status = 'approved'::user_status
));

CREATE POLICY "Members can view their group chat memberships"
ON public.group_chat_members FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.profiles
  WHERE profiles.id = auth.uid()
    AND profiles.role = 'ADMIN'::user_role
    AND profiles.status = 'approved'::user_status
));

-- RLS policies for group_chat_messages
CREATE POLICY "Admins can send group messages"
ON public.group_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND sender_role = 'ADMIN'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'ADMIN'::user_role
      AND profiles.status = 'approved'::user_status
  )
);

CREATE POLICY "Members can send group messages"
ON public.group_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.group_chat_members
    WHERE group_chat_members.group_chat_id = group_chat_messages.group_chat_id
      AND group_chat_members.user_id = auth.uid()
  )
);

CREATE POLICY "Members can view their group messages"
ON public.group_chat_messages FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.group_chat_members
  WHERE group_chat_members.group_chat_id = group_chat_messages.group_chat_id
    AND group_chat_members.user_id = auth.uid()
));

CREATE POLICY "Members can update read status"
ON public.group_chat_messages FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.group_chat_members
  WHERE group_chat_members.group_chat_id = group_chat_messages.group_chat_id
    AND group_chat_members.user_id = auth.uid()
));

-- Add realtime for group chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;