-- Create documents storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
-- Read: owner can read their files, admin can read all
CREATE POLICY "Users can read their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND (
    auth.uid()::text = (string_to_array(name, '/'))[1]
    OR public.is_admin()
  )
);

-- Insert: owner can only upload CVs, admin can upload all
CREATE POLICY "Users can upload CVs" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND (
    (auth.uid()::text = (string_to_array(name, '/'))[1] AND name LIKE '%/CV/%')
    OR public.is_admin()
  )
);

-- Update: owner can update their CVs, admin can update all
CREATE POLICY "Users can update their CVs" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND (
    (auth.uid()::text = (string_to_array(name, '/'))[1] AND name LIKE '%/CV/%')
    OR public.is_admin()
  )
);

-- Delete: only admin
CREATE POLICY "Only admin can delete documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' AND public.is_admin()
);

-- Add RPC function for document insertion
CREATE OR REPLACE FUNCTION public.doc_insert(
  _user_id uuid,
  _type text,
  _filename text,
  _size bigint,
  _mime text,
  _storage_path text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_is_admin     boolean := public.is_admin();
  v_uid          uuid    := auth.uid();
  v_next_version int;
  v_id           uuid;
  v_type         public.document_type;
begin
  if not v_is_admin and v_uid is null then
    raise exception 'not authenticated';
  end if;

  -- regole: utente normale può inserire SOLO CV per sé stesso
  if not v_is_admin then
    if v_uid <> _user_id then
      raise exception 'forbidden: cannot insert documents for another user';
    end if;
    if upper(_type) <> 'CV' then
      raise exception 'forbidden: non-admin can only insert CV';
    end if;
  end if;

  -- cast sicuro text -> enum
  v_type := upper(_type)::public.document_type;  -- valori ammessi: 'CV','CONTRACT'

  select coalesce(max(version), 0) + 1
  into v_next_version
  from public.documents
  where user_id = _user_id and type = v_type;

  insert into public.documents(user_id, type, version, filename, size_bytes, mime, storage_path)
  values (_user_id, v_type, v_next_version, _filename, _size, _mime, _storage_path)
  returning id into v_id;

  return v_id;
end $$;

-- Add RPC to get latest document
CREATE OR REPLACE FUNCTION public.doc_latest(
  _user_id uuid,
  _type text
)
RETURNS documents
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select d.*
  from public.documents d
  where d.user_id = _user_id
    and d.type::text = upper(_type)
  order by d.version desc
  limit 1;
$$;

-- Update documents table to align with RPC
ALTER TABLE public.documents 
  DROP COLUMN IF EXISTS file_size,
  DROP COLUMN IF EXISTS url,
  DROP COLUMN IF EXISTS is_current,
  DROP COLUMN IF EXISTS visibility,
  DROP COLUMN IF EXISTS mime_type,
  ADD COLUMN IF NOT EXISTS size_bytes bigint,
  ADD COLUMN IF NOT EXISTS mime text,
  ADD COLUMN IF NOT EXISTS storage_path text;