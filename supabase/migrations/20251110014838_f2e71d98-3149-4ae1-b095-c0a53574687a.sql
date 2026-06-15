-- Create client_users table
CREATE TABLE public.client_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  student_status TEXT NOT NULL,
  cv_url TEXT,
  photo_url TEXT,
  linkedin_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_services table
CREATE TABLE public.client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  requires_university BOOLEAN DEFAULT false,
  requires_sector BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_cart table
CREATE TABLE public.client_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES client_services(id) ON DELETE CASCADE,
  associate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_orders table
CREATE TABLE public.client_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  associate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_receipt_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_order_items table
CREATE TABLE public.client_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES client_orders(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES client_services(id) ON DELETE CASCADE,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_projects table
CREATE TABLE public.client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES client_orders(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  associate_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_id UUID NOT NULL REFERENCES client_services(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  google_meet_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_meeting_slots table
CREATE TABLE public.client_meeting_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  proposed_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_project_documents table
CREATE TABLE public.client_project_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_admin_messages table
CREATE TABLE public.client_admin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create client_feedback table
CREATE TABLE public.client_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES client_users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_meeting_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_project_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_admin_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies for client_users
CREATE POLICY "Allow public signup" ON client_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own profile" ON client_users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON client_users FOR UPDATE USING (true);

-- RLS Policies for client_services
CREATE POLICY "Services visible to all" ON client_services FOR SELECT USING (true);

-- RLS Policies for client_cart
CREATE POLICY "Cart operations" ON client_cart FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for client_orders
CREATE POLICY "Order operations" ON client_orders FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for client_order_items
CREATE POLICY "Order items operations" ON client_order_items FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for client_projects
CREATE POLICY "Project operations" ON client_projects FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for client_meeting_slots
CREATE POLICY "Meeting slots operations" ON client_meeting_slots FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for client_project_documents
CREATE POLICY "Document operations" ON client_project_documents FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for client_admin_messages
CREATE POLICY "Message operations" ON client_admin_messages FOR ALL USING (true) WITH CHECK (true);

-- RLS Policies for client_feedback
CREATE POLICY "Feedback operations" ON client_feedback FOR ALL USING (true) WITH CHECK (true);

-- Insert initial services
INSERT INTO public.client_services (name, category, subcategory, description, price, requires_university, requires_sector) VALUES
-- Take Off
('Personalized Timeline', 'Take Off', 'High School to University', 'Access timeline with deadlines and study plan for entrance tests. Discounted access to the best preparation resources included in the study plan. Created by a student from the University of Interest. Presented in a 1:1 online meeting by the student from the University of Interest.', 75.00, true, false),
('Comparative Presentations', 'Take Off', 'High School to University', 'Created by 2+ students from the universities of interest. Quantitative data + non-public insights to facilitate choice. Conclusion with comparison KPIs and personal opinions.', 70.00, true, false),
('In-Depth Presentations', 'Take Off', 'High School to University', 'Presentation created by a student from the university of interest. Quantitative data + personal experience. Conclusion with personalized career advice based on your profile.', 50.00, true, false),

-- Layover
('Personalized Timeline', 'Layover', 'University Transfers', 'Access timeline with deadlines and study plan for entrance tests. Discounted access to the best preparation resources included in the study plan. Created by a student from the University of Interest. Presented in a 1:1 online meeting by the student from the University of Interest.', 80.00, true, false),
('Comparative Presentations', 'Layover', 'University Transfers', 'Created by 2+ students from the universities of interest. Quantitative data + non-public insights to facilitate choice. Conclusion with comparison KPIs and personal opinions.', 75.00, true, false),
('In-Depth Presentations', 'Layover', 'University Transfers', 'Presentation created by a student from the university of interest. Quantitative data + personal experience. Conclusion with personalized career advice based on your profile.', 50.00, true, false),
('University Eligibility Verification', 'Layover', 'University Transfers', 'Career Pilot contacts universities directly to verify transfer eligibility.', 10.00, true, false),

-- Summit
('Personalized Timeline', 'Summit', 'University to Master', 'Access timeline with deadlines and study plan for entrance tests.', 80.00, true, false),
('Comparative Analysis', 'Summit', 'University to Master', 'Comparison of multiple master programs.', 75.00, true, false),
('In-Depth Presentations', 'Summit', 'University to Master', 'Detailed presentation of a specific master program.', 60.00, true, false),
('CV Rewriting', 'Summit', 'University to Master', 'Professional CV rewriting service.', 70.00, false, false),

-- Altitude
('Career Insights', 'Altitude', 'Internship Placement', 'Call with a professional working in the sector of interest. Requirements, skills, and sector dynamics. Practical career tips tailored to the student profile.', 45.00, false, true),
('Personalized Career Roadmap', 'Altitude', 'Internship Placement', 'We connect you with a professional currently working in your field of interest. The expert reviews your CV and interviews you to get to know you better. Based on their own experience, designs a practical personalized roadmap.', 100.00, false, true),
('CV, Cover & Interview by CareerBoost & Talflow', 'Altitude', 'Internship Placement', 'Service managed by CareerBoost. CV + cover letter rewritten by an expert. Interview simulations + access to masterclasses.', 75.00, false, false),

-- Additional Services
('Job Updates Hub', 'Additional Services', null, 'WhatsApp group divided into 5 sectors (Investment Banking, Wealth & Asset Management, Consulting, Private Equity & Hedge Funds, Luxury Goods & Lifestyle) with constant updates on job openings, closings and news.', 5.00, false, false),
('Talent Pool', 'Additional Services', null, 'Platform reserved for 20 selected students, visible to partner companies who select students.', 5.00, false, false),
('Pathways Consultation', 'Additional Services', null, 'For high school students who want to enrich their CV with experiences (volunteering, languages, public speaking, exchange programs).', 30.00, false, false),
('Pathways Platform Access', 'Additional Services', null, 'Monthly access to the Pathways platform after consultation.', 5.00, false, false);