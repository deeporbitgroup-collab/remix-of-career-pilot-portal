-- Create table for partner documents
CREATE TABLE public.partner_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('contract', 'document')),
  filename TEXT NOT NULL,
  storage_path TEXT,
  mime_type TEXT,
  size_bytes BIGINT,
  uploaded_by UUID NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for partner documents
-- Partners can view their own documents
CREATE POLICY "Partners can view their documents" 
ON public.partner_documents 
FOR SELECT 
USING (
  partner_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'PARTNER'::user_role 
    AND status = 'approved'::user_status
  )
);

-- Partners can upload/update their own documents (not contracts)
CREATE POLICY "Partners can manage their documents" 
ON public.partner_documents 
FOR ALL 
USING (
  partner_id = auth.uid() 
  AND type = 'document'
  AND uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'PARTNER'::user_role 
    AND status = 'approved'::user_status
  )
)
WITH CHECK (
  partner_id = auth.uid() 
  AND type = 'document'
  AND uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'PARTNER'::user_role 
    AND status = 'approved'::user_status
  )
);

-- Admins can manage all partner documents
CREATE POLICY "Admins can manage all partner documents" 
ON public.partner_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

-- Create storage bucket for partner documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('partner-documents', 'partner-documents', false);

-- Storage policies for partner documents bucket
-- Partners can view their own files
CREATE POLICY "Partners can view their files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'partner-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Partners can upload their own files
CREATE POLICY "Partners can upload their files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Partners can update their own files
CREATE POLICY "Partners can update their files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'partner-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Partners can delete their own files
CREATE POLICY "Partners can delete their files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'partner-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admins can manage all files in the bucket
CREATE POLICY "Admins can view all partner files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'partner-documents'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

CREATE POLICY "Admins can upload partner files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'partner-documents'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

CREATE POLICY "Admins can update partner files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'partner-documents'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

CREATE POLICY "Admins can delete partner files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'partner-documents'
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

-- Add trigger to update updated_at
CREATE TRIGGER update_partner_documents_updated_at
BEFORE UPDATE ON public.partner_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();