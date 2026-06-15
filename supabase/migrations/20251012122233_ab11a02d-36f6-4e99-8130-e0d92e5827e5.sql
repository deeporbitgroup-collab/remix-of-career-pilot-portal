-- Drop existing restrictive policy for student receipts upload
DROP POLICY IF EXISTS "Students can upload receipts" ON talent_pool_payment_receipts;

-- Create new policy that allows students to insert receipts
-- Verify that user_id exists in talent_pool_users with STUDENT role
CREATE POLICY "Students can upload their receipts"
ON talent_pool_payment_receipts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM talent_pool_users
    WHERE id = talent_pool_payment_receipts.user_id
    AND role = 'STUDENT'::talent_pool_role
  )
);