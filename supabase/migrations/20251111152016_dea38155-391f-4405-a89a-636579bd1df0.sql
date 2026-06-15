-- Create storage bucket for client project documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-project-documents', 'client-project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-project-documents
CREATE POLICY "Users can view their project documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-project-documents' AND
  (
    -- Check if user is client of project
    EXISTS (
      SELECT 1 FROM client_projects cp
      JOIN client_shared_documents csd ON csd.project_id = cp.id
      WHERE csd.storage_path = name AND cp.client_id IN (SELECT id FROM client_users)
    )
    OR
    -- Check if user is associate of project
    EXISTS (
      SELECT 1 FROM client_projects cp
      JOIN client_shared_documents csd ON csd.project_id = cp.id
      WHERE csd.storage_path = name AND cp.associate_id = auth.uid()
    )
    OR
    -- Admin can view all
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
    )
  )
);

CREATE POLICY "Project members can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-project-documents' AND
  (
    -- Client can upload
    EXISTS (
      SELECT 1 FROM client_projects cp
      WHERE cp.client_id IN (SELECT id FROM client_users)
    )
    OR
    -- Associate can upload
    auth.uid() IS NOT NULL
    OR
    -- Admin can upload
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
    )
  )
);

CREATE POLICY "Uploaders can delete their documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-project-documents' AND
  (
    -- Check ownership via client_shared_documents
    EXISTS (
      SELECT 1 FROM client_shared_documents
      WHERE storage_path = name AND (
        uploaded_by_id IN (SELECT id FROM client_users) OR
        uploaded_by_id = auth.uid()
      )
    )
    OR
    -- Admin can delete
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'approved'
    )
  )
);