-- Allow unauthenticated users (anon) to upload documents to specific buckets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Anon can upload talent-pool docs'
  ) THEN
    CREATE POLICY "Anon can upload talent-pool docs"
    ON storage.objects
    FOR INSERT TO anon
    WITH CHECK (bucket_id IN ('talent-pool-cv','talent-pool-covers'));
  END IF;
END $$;