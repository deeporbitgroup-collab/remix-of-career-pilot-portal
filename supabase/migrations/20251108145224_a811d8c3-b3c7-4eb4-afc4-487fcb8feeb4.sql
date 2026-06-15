-- Create admin_student_messages table for bidirectional communication
CREATE TABLE IF NOT EXISTS public.admin_student_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.talent_pool_users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN', 'STUDENT')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  parent_message_id UUID REFERENCES public.admin_student_messages(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_student_messages ENABLE ROW LEVEL SECURITY;

-- Admin can manage all messages
CREATE POLICY "Admin can manage all messages"
ON public.admin_student_messages
FOR ALL
TO authenticated
USING (is_talent_pool_admin(auth.uid()));

-- Students can view their messages
CREATE POLICY "Students can view their messages"
ON public.admin_student_messages
FOR SELECT
TO authenticated
USING (student_id = auth.uid());

-- Students can create replies
CREATE POLICY "Students can create replies"
ON public.admin_student_messages
FOR INSERT
TO authenticated
WITH CHECK (student_id = auth.uid() AND sender_role = 'STUDENT');

-- Create index for performance
CREATE INDEX idx_admin_student_messages_student_id ON public.admin_student_messages(student_id);
CREATE INDEX idx_admin_student_messages_created_at ON public.admin_student_messages(created_at DESC);