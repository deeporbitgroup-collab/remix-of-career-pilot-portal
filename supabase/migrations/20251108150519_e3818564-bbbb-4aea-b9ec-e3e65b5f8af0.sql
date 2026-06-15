-- Enable RLS on admin_company_messages and admin_student_messages
ALTER TABLE admin_company_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_student_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all reads for company messages" ON admin_company_messages;
DROP POLICY IF EXISTS "Allow all inserts for company messages" ON admin_company_messages;
DROP POLICY IF EXISTS "Allow all reads for student messages" ON admin_student_messages;
DROP POLICY IF EXISTS "Allow all inserts for student messages" ON admin_student_messages;

-- Create permissive policies for company messages
-- Allow all reads (Admin, Company can read their messages)
CREATE POLICY "Allow all reads for company messages"
ON admin_company_messages
FOR SELECT
USING (true);

-- Allow all inserts (Edge functions with service role will insert)
CREATE POLICY "Allow all inserts for company messages"
ON admin_company_messages
FOR INSERT
WITH CHECK (true);

-- Create permissive policies for student messages
-- Allow all reads (Admin, Student can read their messages)
CREATE POLICY "Allow all reads for student messages"
ON admin_student_messages
FOR SELECT
USING (true);

-- Allow all inserts (Edge functions with service role will insert)
CREATE POLICY "Allow all inserts for student messages"
ON admin_student_messages
FOR INSERT
WITH CHECK (true);