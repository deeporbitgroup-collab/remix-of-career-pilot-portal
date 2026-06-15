-- Fix RLS policies for company_selected_students table to allow students to see who selected them

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can view companies that selected them" ON company_selected_students;
DROP POLICY IF EXISTS "Companies can view their selections" ON company_selected_students;
DROP POLICY IF EXISTS "Anyone can view selections" ON company_selected_students;

-- Enable RLS
ALTER TABLE company_selected_students ENABLE ROW LEVEL SECURITY;

-- Allow students to see which companies selected them
CREATE POLICY "Students can view companies that selected them"
ON company_selected_students
FOR SELECT
USING (
  student_id IN (
    SELECT user_id FROM student_profiles WHERE user_id = student_id
  )
);

-- Allow companies to see their own selections
CREATE POLICY "Companies can view their selections"
ON company_selected_students
FOR SELECT
USING (
  company_id IN (
    SELECT user_id FROM company_profiles WHERE user_id = company_id
  )
);

-- Allow companies to insert selections
CREATE POLICY "Companies can select students"
ON company_selected_students
FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT user_id FROM company_profiles WHERE user_id = company_id
  )
);

-- Allow companies to delete their selections
CREATE POLICY "Companies can remove their selections"
ON company_selected_students
FOR DELETE
USING (
  company_id IN (
    SELECT user_id FROM company_profiles WHERE user_id = company_id
  )
);