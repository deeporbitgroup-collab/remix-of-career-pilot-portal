-- Create enum for recruiting next step options
CREATE TYPE public.recruiting_next_step AS ENUM ('DIRECT_HIRING', 'INTERVIEW', 'ONLINE_ASSESSMENT');

-- Create enum for recruiting process status
CREATE TYPE public.recruiting_status AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- Table for tracking active recruiting processes between company and student
CREATE TABLE public.recruiting_processes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.talent_pool_users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.talent_pool_users(id) ON DELETE CASCADE,
  selection_id UUID REFERENCES public.company_selected_students(id) ON DELETE SET NULL,
  next_step public.recruiting_next_step NOT NULL,
  status public.recruiting_status NOT NULL DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, student_id)
);

-- Enable RLS
ALTER TABLE public.recruiting_processes ENABLE ROW LEVEL SECURITY;

-- RLS policies for recruiting_processes
CREATE POLICY "Students can view their recruiting processes"
ON public.recruiting_processes FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Companies can view their recruiting processes"
ON public.recruiting_processes FOR SELECT
USING (company_id = auth.uid());

CREATE POLICY "Companies can create recruiting processes"
ON public.recruiting_processes FOR INSERT
WITH CHECK (company_id = auth.uid());

CREATE POLICY "Companies can update their recruiting processes"
ON public.recruiting_processes FOR UPDATE
USING (company_id = auth.uid());

CREATE POLICY "Admin can manage all recruiting processes"
ON public.recruiting_processes FOR ALL
USING (is_talent_pool_admin(auth.uid()));

-- Table for chat messages in recruiting processes
CREATE TABLE public.recruiting_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.recruiting_processes(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('STUDENT', 'COMPANY', 'ADMIN')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruiting_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for recruiting_messages
CREATE POLICY "Process participants can view messages"
ON public.recruiting_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recruiting_processes rp
    WHERE rp.id = recruiting_messages.process_id
    AND (rp.student_id = auth.uid() OR rp.company_id = auth.uid())
  )
  OR is_talent_pool_admin(auth.uid())
);

CREATE POLICY "Process participants can send messages"
ON public.recruiting_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recruiting_processes rp
    WHERE rp.id = recruiting_messages.process_id
    AND (rp.student_id = auth.uid() OR rp.company_id = auth.uid())
  )
  OR is_talent_pool_admin(auth.uid())
);

CREATE POLICY "Admin can manage all messages"
ON public.recruiting_messages FOR ALL
USING (is_talent_pool_admin(auth.uid()));

-- Table for documents shared in recruiting processes
CREATE TABLE public.recruiting_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  process_id UUID NOT NULL REFERENCES public.recruiting_processes(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL,
  uploader_type TEXT NOT NULL CHECK (uploader_type IN ('STUDENT', 'COMPANY', 'ADMIN')),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recruiting_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for recruiting_documents
CREATE POLICY "Process participants can view documents"
ON public.recruiting_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.recruiting_processes rp
    WHERE rp.id = recruiting_documents.process_id
    AND (rp.student_id = auth.uid() OR rp.company_id = auth.uid())
  )
  OR is_talent_pool_admin(auth.uid())
);

CREATE POLICY "Process participants can upload documents"
ON public.recruiting_documents FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.recruiting_processes rp
    WHERE rp.id = recruiting_documents.process_id
    AND (rp.student_id = auth.uid() OR rp.company_id = auth.uid())
  )
  OR is_talent_pool_admin(auth.uid())
);

CREATE POLICY "Uploaders can delete their documents"
ON public.recruiting_documents FOR DELETE
USING (uploader_id = auth.uid() OR is_talent_pool_admin(auth.uid()));

CREATE POLICY "Admin can manage all documents"
ON public.recruiting_documents FOR ALL
USING (is_talent_pool_admin(auth.uid()));

-- Create storage bucket for recruiting documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('recruiting-documents', 'recruiting-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recruiting documents
CREATE POLICY "Process participants can view recruiting docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'recruiting-documents');

CREATE POLICY "Process participants can upload recruiting docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'recruiting-documents');

CREATE POLICY "Uploaders can delete recruiting docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'recruiting-documents');

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_recruiting_process_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_recruiting_processes_updated_at
BEFORE UPDATE ON public.recruiting_processes
FOR EACH ROW
EXECUTE FUNCTION public.update_recruiting_process_updated_at();