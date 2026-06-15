-- Create table for admin-associate messaging
CREATE TABLE IF NOT EXISTS public.admin_associate_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  associate_id UUID NOT NULL,
  message TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN', 'ASSOCIATE')),
  subject TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  parent_message_id UUID REFERENCES public.admin_associate_messages(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_associate_messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Associates can view their messages"
  ON public.admin_associate_messages
  FOR SELECT
  USING (associate_id = auth.uid());

CREATE POLICY "Associates can create messages"
  ON public.admin_associate_messages
  FOR INSERT
  WITH CHECK (associate_id = auth.uid() AND sender_role = 'ASSOCIATE');

CREATE POLICY "Admins can view all messages"
  ON public.admin_associate_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
    )
  );

CREATE POLICY "Admins can create messages"
  ON public.admin_associate_messages
  FOR INSERT
  WITH CHECK (
    sender_role = 'ADMIN' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
    )
  );

CREATE POLICY "Admins and associates can update read status"
  ON public.admin_associate_messages
  FOR UPDATE
  USING (
    associate_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
    )
  );

-- Add index for performance
CREATE INDEX idx_admin_associate_messages_associate_id ON public.admin_associate_messages(associate_id);
CREATE INDEX idx_admin_associate_messages_created_at ON public.admin_associate_messages(created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_admin_associate_messages_updated_at
  BEFORE UPDATE ON public.admin_associate_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();