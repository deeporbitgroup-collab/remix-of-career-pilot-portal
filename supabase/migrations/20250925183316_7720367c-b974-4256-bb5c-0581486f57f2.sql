-- Create announcements table for admin communications
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  target_audience TEXT NOT NULL CHECK (target_audience IN ('ASSOCIATE', 'PARTNER', 'BOTH')),
  priority BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for announcement attachments
CREATE TABLE public.announcement_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for announcement attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('announcements', 'announcements', true);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Admins can manage announcements" 
ON public.announcements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

CREATE POLICY "Associates can view announcements for them" 
ON public.announcements 
FOR SELECT 
USING (
  active = true 
  AND (target_audience IN ('ASSOCIATE', 'BOTH'))
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ASSOCIATE'::user_role 
    AND status = 'approved'::user_status
  )
);

CREATE POLICY "Partners can view announcements for them" 
ON public.announcements 
FOR SELECT 
USING (
  active = true 
  AND (target_audience IN ('PARTNER', 'BOTH'))
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'PARTNER'::user_role 
    AND status = 'approved'::user_status
  )
);

-- RLS Policies for attachments
CREATE POLICY "Admins can manage attachments" 
ON public.announcement_attachments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

CREATE POLICY "Users can view attachments for announcements they can see" 
ON public.announcement_attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM announcements a
    WHERE a.id = announcement_id
    AND a.active = true
    AND (
      -- Associates
      (a.target_audience IN ('ASSOCIATE', 'BOTH') AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'ASSOCIATE'::user_role 
        AND status = 'approved'::user_status
      ))
      OR
      -- Partners
      (a.target_audience IN ('PARTNER', 'BOTH') AND EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
        AND role = 'PARTNER'::user_role 
        AND status = 'approved'::user_status
      ))
    )
  )
);

-- Storage policies for announcement attachments
CREATE POLICY "Admins can upload announcement files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'announcements' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

CREATE POLICY "Anyone can view announcement files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'announcements');

CREATE POLICY "Admins can delete announcement files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'announcements' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role 
    AND status = 'approved'::user_status
  )
);

-- Trigger to update updated_at
CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();