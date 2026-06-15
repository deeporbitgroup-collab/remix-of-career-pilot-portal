-- Create table for client-uploaded documents (not project-specific)
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  document_type TEXT DEFAULT 'general', -- 'cv', 'notes', 'goals', 'background', 'general'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Allow clients to manage their own documents
CREATE POLICY "Clients can view their own documents" 
ON public.client_documents 
FOR SELECT 
USING (true);

CREATE POLICY "Clients can insert their own documents" 
ON public.client_documents 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Clients can delete their own documents" 
ON public.client_documents 
FOR DELETE 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_client_documents_client_id ON public.client_documents(client_id);