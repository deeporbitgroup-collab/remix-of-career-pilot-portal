-- Add new status for students (ADMITTED = can login but needs payment)
ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'ADMITTED';

-- Update student profiles to track payment details
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS monthly_payment_active boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS monthly_payment_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS stage_payment_required boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS stage_payment_paid boolean DEFAULT false;

-- Create table for payment receipts
CREATE TABLE IF NOT EXISTS talent_pool_payment_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES talent_pool_users(id) ON DELETE CASCADE,
  payment_type text NOT NULL CHECK (payment_type IN ('MONTHLY', 'STAGE')),
  amount numeric(10,2) NOT NULL,
  receipt_url text,
  upload_date timestamp with time zone DEFAULT now(),
  verification_status text DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  verified_by uuid,
  verified_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE talent_pool_payment_receipts ENABLE ROW LEVEL SECURITY;

-- Policies for payment receipts
CREATE POLICY "Students can view their own receipts"
ON talent_pool_payment_receipts
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Students can upload receipts"
ON talent_pool_payment_receipts
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can manage all receipts"
ON talent_pool_payment_receipts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM talent_pool_users
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);

-- Create storage bucket for payment receipts if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for payment receipts
CREATE POLICY "Students can upload their receipts"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Students can view their receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admin can view all receipts"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND
  EXISTS (
    SELECT 1 FROM talent_pool_users
    WHERE id = auth.uid() AND role = 'ADMIN'
  )
);