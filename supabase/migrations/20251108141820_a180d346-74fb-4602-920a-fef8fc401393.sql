-- Create admin_company_messages table for bidirectional communication
CREATE TABLE IF NOT EXISTS public.admin_company_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.talent_pool_users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN', 'COMPANY')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  parent_message_id UUID REFERENCES public.admin_company_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_company_messages ENABLE ROW LEVEL SECURITY;

-- Admin can view and create all messages
CREATE POLICY "Admin can manage all messages"
ON public.admin_company_messages
FOR ALL
USING (is_talent_pool_admin(auth.uid()));

-- Companies can view their messages
CREATE POLICY "Companies can view their messages"
ON public.admin_company_messages
FOR SELECT
USING (company_id = auth.uid());

-- Companies can create replies
CREATE POLICY "Companies can create replies"
ON public.admin_company_messages
FOR INSERT
WITH CHECK (company_id = auth.uid() AND sender_role = 'COMPANY');

-- Create index for better performance
CREATE INDEX idx_admin_company_messages_company_id ON public.admin_company_messages(company_id);
CREATE INDEX idx_admin_company_messages_parent_id ON public.admin_company_messages(parent_message_id);

-- Update timestamp trigger
CREATE TRIGGER update_admin_company_messages_updated_at
BEFORE UPDATE ON public.admin_company_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_talent_pool_timestamp();