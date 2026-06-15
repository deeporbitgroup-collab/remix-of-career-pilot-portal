-- Crea le policy per il bucket payment-receipts
-- Gli studenti possono caricare le loro ricevute
-- Gli admin possono vedere tutte le ricevute

CREATE POLICY "Students can upload their own payment receipts"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Students can view their own payment receipts"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'payment-receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Public can view payment receipts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-receipts');