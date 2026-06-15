-- Add missing columns to recruiting_messages
ALTER TABLE public.recruiting_messages
ADD COLUMN IF NOT EXISTS sender_name TEXT NOT NULL DEFAULT '';

-- Add missing columns to recruiting_documents
ALTER TABLE public.recruiting_documents
ADD COLUMN IF NOT EXISTS uploader_name TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'FILE',
ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Make filename nullable (since links don't have filenames)
ALTER TABLE public.recruiting_documents
ALTER COLUMN filename DROP NOT NULL,
ALTER COLUMN storage_path DROP NOT NULL;

-- Add check constraint for document_type
ALTER TABLE public.recruiting_documents
ADD CONSTRAINT recruiting_documents_type_check 
CHECK (document_type IN ('FILE', 'LINK'));