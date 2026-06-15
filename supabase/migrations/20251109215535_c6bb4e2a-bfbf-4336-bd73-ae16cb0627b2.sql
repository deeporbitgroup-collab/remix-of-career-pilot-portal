-- Create admin_partner_messages table for Partner-Admin communication
CREATE TABLE IF NOT EXISTS public.admin_partner_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  subject TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN', 'PARTNER')),
  parent_message_id UUID REFERENCES public.admin_partner_messages(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_partner_messages ENABLE ROW LEVEL SECURITY;

-- Allow partners to view their messages
CREATE POLICY "Partners can view their messages"
ON public.admin_partner_messages
FOR SELECT
TO authenticated
USING (partner_id = auth.uid());

-- Allow partners to create messages
CREATE POLICY "Partners can create messages"
ON public.admin_partner_messages
FOR INSERT
TO authenticated
WITH CHECK (partner_id = auth.uid() AND sender_role = 'PARTNER');

-- Allow admins to view all messages
CREATE POLICY "Admins can view all messages"
ON public.admin_partner_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
    AND status = 'approved'
  )
);

-- Allow admins to create messages
CREATE POLICY "Admins can create messages"
ON public.admin_partner_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_role = 'ADMIN' 
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
    AND status = 'approved'
  )
);

-- Allow admins and partners to update read status
CREATE POLICY "Admins and partners can update read status"
ON public.admin_partner_messages
FOR UPDATE
TO authenticated
USING (
  partner_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'ADMIN'
    AND status = 'approved'
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_admin_partner_messages_updated_at
  BEFORE UPDATE ON public.admin_partner_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Create index for performance
CREATE INDEX idx_admin_partner_messages_partner_id ON public.admin_partner_messages(partner_id);
CREATE INDEX idx_admin_partner_messages_created_at ON public.admin_partner_messages(created_at DESC);