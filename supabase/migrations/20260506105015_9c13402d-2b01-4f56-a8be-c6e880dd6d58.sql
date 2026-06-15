
CREATE TABLE public.prep_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL CHECK (service IN ('TAKEOFF','LAYOVER','ALTITUDE','SUMMIT')),
  title text NOT NULL,
  description text,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime text,
  size_bytes bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prep_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage prep_materials"
  ON public.prep_materials FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Approved users view prep_materials"
  ON public.prep_materials FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('ASSOCIATE','PARTNER','ADMIN')
    )
  );

CREATE INDEX idx_prep_materials_service ON public.prep_materials(service);

INSERT INTO storage.buckets (id, name, public)
VALUES ('prep-materials', 'prep-materials', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins manage prep-materials objects"
  ON storage.objects FOR ALL
  USING (bucket_id = 'prep-materials' AND public.is_admin())
  WITH CHECK (bucket_id = 'prep-materials' AND public.is_admin());

CREATE POLICY "Approved users read prep-materials objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'prep-materials'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.status = 'approved'
        AND p.role IN ('ASSOCIATE','PARTNER','ADMIN')
    )
  );
