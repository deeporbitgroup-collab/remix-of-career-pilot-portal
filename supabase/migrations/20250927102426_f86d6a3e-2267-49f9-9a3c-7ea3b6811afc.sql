-- Create enums for talent pool
CREATE TYPE talent_pool_role AS ENUM ('ADMIN', 'STUDENT', 'COMPANY');
CREATE TYPE registration_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE payment_status AS ENUM ('NOT_PAID', 'AWAITING_VERIFICATION', 'VERIFYING', 'VERIFIED', 'REJECTED');
CREATE TYPE access_status AS ENUM ('BLOCKED', 'UNLOCKED');
CREATE TYPE company_size AS ENUM ('STARTUP', 'BOUTIQUE', 'MEDIUM_SIZE', 'LARGE_COMPANY');

-- Create talent pool users table
CREATE TABLE public.talent_pool_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role talent_pool_role NOT NULL,
  registration_status registration_status DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student profiles table
CREATE TABLE public.student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES talent_pool_users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  linkedin_url TEXT,
  photo_url TEXT,
  cv_url TEXT,
  cover_letter_url TEXT,
  preferred_sectors TEXT[],
  internship_duration_months INTEGER,
  full_employment_available BOOLEAN DEFAULT false,
  payment_status payment_status DEFAULT 'NOT_PAID',
  access_status access_status DEFAULT 'BLOCKED',
  payment_reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create company profiles table
CREATE TABLE public.company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES talent_pool_users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  sector TEXT NOT NULL,
  size company_size NOT NULL,
  reference_email TEXT NOT NULL,
  linkedin_url TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create payments table
CREATE TABLE public.talent_pool_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES talent_pool_users(id) ON DELETE CASCADE,
  reference TEXT UNIQUE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  proof_url TEXT,
  notes TEXT,
  status payment_status DEFAULT 'AWAITING_VERIFICATION',
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activity logs table for talent pool
CREATE TABLE public.talent_pool_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.talent_pool_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.talent_pool_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for talent_pool_users
CREATE POLICY "Users can view their own data" ON talent_pool_users
  FOR SELECT USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN'
  ));

CREATE POLICY "Anyone can insert during registration" ON talent_pool_users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own data" ON talent_pool_users
  FOR UPDATE USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- RLS Policies for student_profiles
CREATE POLICY "Students can view their own profile" ON student_profiles
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN') OR
    EXISTS (SELECT 1 FROM talent_pool_users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'COMPANY' 
            AND u.registration_status = 'APPROVED')
  );

CREATE POLICY "Students can insert their own profile" ON student_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can update their own profile" ON student_profiles
  FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- RLS Policies for company_profiles
CREATE POLICY "Companies can view approved companies" ON company_profiles
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN') OR
    EXISTS (SELECT 1 FROM talent_pool_users u 
            JOIN student_profiles sp ON sp.user_id = u.id
            WHERE u.id = auth.uid() 
            AND u.role = 'STUDENT' 
            AND u.registration_status = 'APPROVED'
            AND sp.payment_status = 'VERIFIED'
            AND sp.access_status = 'UNLOCKED')
  );

CREATE POLICY "Companies can insert their own profile" ON company_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Companies can update their own profile" ON company_profiles
  FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN'
  ));

-- RLS Policies for payments
CREATE POLICY "View payments policy" ON talent_pool_payments
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Insert payments policy" ON talent_pool_payments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "Update payments policy" ON talent_pool_payments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- RLS Policies for logs
CREATE POLICY "Admin can view logs" ON talent_pool_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN')
  );

CREATE POLICY "System can insert logs" ON talent_pool_logs
  FOR INSERT WITH CHECK (true);

-- Create function to handle user registration
CREATE OR REPLACE FUNCTION handle_talent_pool_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate payment reference for students upon approval
  IF NEW.role = 'STUDENT' AND NEW.registration_status = 'APPROVED' AND OLD.registration_status != 'APPROVED' THEN
    UPDATE student_profiles 
    SET payment_reference = 'CP-' || SUBSTRING(NEW.id::TEXT, 1, 8) || '-' || TO_CHAR(NOW(), 'YYYYMMDD'),
        payment_status = 'AWAITING_VERIFICATION'
    WHERE user_id = NEW.id;
  END IF;
  
  -- Log the status change
  INSERT INTO talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    auth.uid(),
    'REGISTRATION_STATUS_CHANGE',
    'USER',
    NEW.id,
    jsonb_build_object(
      'old_status', OLD.registration_status,
      'new_status', NEW.registration_status,
      'role', NEW.role
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for registration status changes
CREATE TRIGGER on_talent_pool_registration_change
  AFTER UPDATE OF registration_status ON talent_pool_users
  FOR EACH ROW
  EXECUTE FUNCTION handle_talent_pool_registration();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_talent_pool_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_talent_pool_users_timestamp
  BEFORE UPDATE ON talent_pool_users
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_pool_timestamp();

CREATE TRIGGER update_student_profiles_timestamp
  BEFORE UPDATE ON student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_pool_timestamp();

CREATE TRIGGER update_company_profiles_timestamp
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_pool_timestamp();

-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('talent-pool-cv', 'talent-pool-cv', false),
  ('talent-pool-covers', 'talent-pool-covers', false),
  ('talent-pool-photos', 'talent-pool-photos', true),
  ('talent-pool-logos', 'talent-pool-logos', true),
  ('talent-pool-payments', 'talent-pool-payments', false);

-- Storage policies for CV bucket
CREATE POLICY "Students can upload their CV" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'talent-pool-cv' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "View CV policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'talent-pool-cv' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role IN ('ADMIN', 'COMPANY'))
    )
  );

-- Storage policies for Cover Letters
CREATE POLICY "Students can upload cover letters" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'talent-pool-covers' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "View cover letters policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'talent-pool-covers' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role IN ('ADMIN', 'COMPANY'))
    )
  );

-- Storage policies for photos
CREATE POLICY "Students can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'talent-pool-photos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'talent-pool-photos');

-- Storage policies for company logos
CREATE POLICY "Companies can upload logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'talent-pool-logos' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'talent-pool-logos');

-- Storage policies for payment proofs
CREATE POLICY "Students can upload payment proofs" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'talent-pool-payments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "View payment proofs policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'talent-pool-payments' AND (
      auth.uid()::text = (storage.foldername(name))[1] OR
      EXISTS (SELECT 1 FROM talent_pool_users WHERE id = auth.uid() AND role = 'ADMIN')
    )
  );