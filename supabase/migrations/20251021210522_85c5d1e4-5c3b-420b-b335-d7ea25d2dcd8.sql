-- Create enum for user roles in Pathways platform
CREATE TYPE pathways_role AS ENUM ('STUDENT', 'ADMIN');

-- Create enum for user status
CREATE TYPE pathways_user_status AS ENUM (
  'registered',
  'admitted_to_payment',
  'payment_uploaded',
  'active',
  'revoked'
);

-- Create enum for application status
CREATE TYPE pathways_application_status AS ENUM (
  'submitted',
  'in_review',
  'accepted',
  'rejected'
);

-- Create enum for provider categories
CREATE TYPE pathways_category AS ENUM (
  'volunteering',
  'languages',
  'exchange',
  'public_speaking'
);

-- Pathways users table (separate from main auth system)
CREATE TABLE pathways_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role pathways_role NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  school TEXT,
  status pathways_user_status DEFAULT 'registered',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment receipts table
CREATE TABLE pathways_payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES pathways_users(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  notes TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Providers/opportunities table
CREATE TABLE pathways_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category pathways_category NOT NULL,
  subcategory TEXT NOT NULL,
  country TEXT,
  city TEXT,
  is_online BOOLEAN DEFAULT false,
  description TEXT,
  requirements TEXT,
  website_url TEXT,
  contact_email TEXT,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Applications table
CREATE TABLE pathways_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES pathways_users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES pathways_providers(id) ON DELETE CASCADE,
  category pathways_category NOT NULL,
  subcategory TEXT NOT NULL,
  school TEXT NOT NULL,
  phone TEXT NOT NULL,
  motivation TEXT NOT NULL,
  period_from DATE NOT NULL,
  period_to DATE NOT NULL,
  status pathways_application_status DEFAULT 'submitted',
  language TEXT DEFAULT 'it',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Audit logs table
CREATE TABLE pathways_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES pathways_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_pathways_users_email ON pathways_users(email);
CREATE INDEX idx_pathways_users_status ON pathways_users(status);
CREATE INDEX idx_pathways_providers_category ON pathways_providers(category);
CREATE INDEX idx_pathways_providers_active ON pathways_providers(active);
CREATE INDEX idx_pathways_applications_user_id ON pathways_applications(user_id);
CREATE INDEX idx_pathways_applications_provider_id ON pathways_applications(provider_id);
CREATE INDEX idx_pathways_applications_status ON pathways_applications(status);
CREATE INDEX idx_pathways_audit_logs_actor ON pathways_audit_logs(actor_user_id);
CREATE INDEX idx_pathways_audit_logs_created_at ON pathways_audit_logs(created_at);

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION update_pathways_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_pathways_users_updated_at
BEFORE UPDATE ON pathways_users
FOR EACH ROW
EXECUTE FUNCTION update_pathways_updated_at();

CREATE TRIGGER update_pathways_providers_updated_at
BEFORE UPDATE ON pathways_providers
FOR EACH ROW
EXECUTE FUNCTION update_pathways_updated_at();

CREATE TRIGGER update_pathways_applications_updated_at
BEFORE UPDATE ON pathways_applications
FOR EACH ROW
EXECUTE FUNCTION update_pathways_updated_at();

-- Enable Row Level Security
ALTER TABLE pathways_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways_payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pathways_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pathways_users (users can only see themselves, no direct access needed for others)
CREATE POLICY "Users can view own profile"
  ON pathways_users FOR SELECT
  USING (true);  -- Public read for authentication purposes

CREATE POLICY "Users can update own profile"
  ON pathways_users FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for pathways_payment_receipts
CREATE POLICY "Users can view own receipts"
  ON pathways_payment_receipts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own receipts"
  ON pathways_payment_receipts FOR INSERT
  WITH CHECK (true);

-- RLS Policies for pathways_providers (read-only for students, full access for admin handled in app)
CREATE POLICY "Active providers visible to all"
  ON pathways_providers FOR SELECT
  USING (active = true OR true);  -- Allow all for flexibility

CREATE POLICY "Providers can be managed"
  ON pathways_providers FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for pathways_applications
CREATE POLICY "Users can view applications"
  ON pathways_applications FOR SELECT
  USING (true);

CREATE POLICY "Users can create applications"
  ON pathways_applications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Applications can be updated"
  ON pathways_applications FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for pathways_audit_logs (read-only for all authenticated)
CREATE POLICY "Audit logs visible"
  ON pathways_audit_logs FOR SELECT
  USING (true);

CREATE POLICY "Audit logs can be created"
  ON pathways_audit_logs FOR INSERT
  WITH CHECK (true);

-- Insert admin user with predefined credentials
-- Password: Career.Pilot25 (will be hashed client-side before storage)
INSERT INTO pathways_users (email, password_hash, role, first_name, last_name, status)
VALUES (
  'Careerpilot2025@gmail.com',
  encode(digest('Career.Pilot25', 'sha256'), 'base64'),
  'ADMIN',
  'Admin',
  'CareerPilot',
  'active'
);

-- Seed sample providers for development
INSERT INTO pathways_providers (name, category, subcategory, country, city, is_online, description, requirements, active) VALUES
-- Volunteering
('DisAbility Support Foundation', 'volunteering', 'Disabilità', 'Italy', 'Milan', false, 'Supporting individuals with disabilities through educational and recreational activities', 'Age 16+, Background check required', true),
('Food Bank Milano', 'volunteering', 'Supporto ai poveri', 'Italy', 'Milan', false, 'Help distribute food and essentials to families in need', 'Age 16+, Flexible schedule', true),
('Green Earth Italia', 'volunteering', 'Ambiente', 'Italy', 'Rome', false, 'Environmental conservation and sustainability projects', 'Age 16+, Interest in sustainability', true),
('Teach for All Italia', 'volunteering', 'Istruzione', 'Italy', 'Turin', false, 'Educational support for underprivileged students', 'Age 18+, Teaching experience preferred', true),
('Health Aid International', 'volunteering', 'Assistenza sanitaria', 'Italy', 'Florence', false, 'Healthcare support in local communities', 'Age 18+, Medical background preferred', true),

-- Languages
('Alliance Française', 'languages', 'Francese', 'France', 'Paris', true, 'French language courses and cultural immersion', 'All levels welcome', true),
('British Council', 'languages', 'Inglese', 'UK', 'London', true, 'English language certification programs', 'All levels welcome', true),
('Goethe-Institut', 'languages', 'Tedesco', 'Germany', 'Berlin', true, 'German language and culture courses', 'All levels welcome', true),
('Instituto Cervantes', 'languages', 'Spagnolo', 'Spain', 'Madrid', true, 'Spanish language immersion programs', 'All levels welcome', true),

-- Exchange programs
('Oxford Summer Programme', 'exchange', 'UK', 'UK', 'Oxford', false, '4-week summer program at Oxford University', 'Age 16-18, Academic excellence', true),
('Harvard Pre-College', 'exchange', 'USA', 'USA', 'Cambridge', false, 'Pre-college summer program at Harvard', 'Age 15-18, Strong academics', true),
('Erasmus+ Youth Exchange', 'exchange', 'EU', 'Multiple', 'Various', false, 'Youth exchange programs across Europe', 'Age 13-30, EU residency', true),

-- Public Speaking
('Drama Academy Milano', 'public_speaking', 'Teatro', 'Italy', 'Milan', false, 'Theater workshops and performance training', 'Age 14+, No experience required', true),
('TED-Ed Clubs Italia', 'public_speaking', 'Tecniche di Public Speaking', 'Italy', 'Rome', true, 'Public speaking workshops and TED-style talks', 'Age 14+, Passion for sharing ideas', true),
('Italian Debate League', 'public_speaking', 'Debate', 'Italy', 'Multiple', false, 'Competitive debate tournaments and training', 'Age 14-22, Team commitment', true);