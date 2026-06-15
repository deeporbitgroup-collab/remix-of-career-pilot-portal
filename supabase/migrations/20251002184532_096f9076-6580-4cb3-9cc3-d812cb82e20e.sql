-- Rimuove le policy precedenti che non funzionano con localStorage auth
DROP POLICY IF EXISTS "Students can upload their own payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Students can view their own payment receipts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view payment receipts" ON storage.objects;

-- Policy semplice: tutti possono inserire e vedere nel bucket payment-receipts
-- Dato che usiamo localStorage auth invece di Supabase Auth

CREATE POLICY "Allow public to insert payment receipts"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-receipts');

CREATE POLICY "Allow public to select payment receipts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-receipts');