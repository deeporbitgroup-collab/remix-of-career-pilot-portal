-- Add new fields to student_profiles for preferences
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS preferred_company_types TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS internship_period TEXT,
ADD COLUMN IF NOT EXISTS compensation_preference TEXT DEFAULT 'BOTH';

-- Add comment for clarity
COMMENT ON COLUMN student_profiles.preferred_company_types IS 'Array of preferred company types: Startup, Medium, Large';
COMMENT ON COLUMN student_profiles.internship_period IS 'Preferred internship period';
COMMENT ON COLUMN student_profiles.compensation_preference IS 'Compensation preference: PAID, UNPAID, BOTH';