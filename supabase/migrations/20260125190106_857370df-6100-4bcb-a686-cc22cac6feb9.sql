-- Add two new Altitude services

-- 1. Expert Career Session (1:1) - €70 - requires associate selection
INSERT INTO public.client_services (name, category, subcategory, description, price, requires_associate, requires_university, requires_sector, is_subscription)
VALUES (
  'Expert Career Session (1:1)',
  'Altitude',
  'Internship Placement',
  'A 60-minute session with an industry professional tailored to your exact career need: interviews, technical prep, role strategy, or skill deep-dives.',
  70.00,
  true,
  false,
  true,
  false
);

-- 2. Half-Day Outreach Sprint - €65 - NO associate selection
INSERT INTO public.client_services (name, category, subcategory, description, price, requires_associate, requires_university, requires_sector, is_subscription)
VALUES (
  'Half-Day Outreach Sprint',
  'Altitude',
  'Internship Placement',
  'We create an outreach email under your name and contact companies where your profile has the best chances (based on your CV). We handle targeted emails and warm outreach to save you hours of ineffective applications.',
  65.00,
  false,
  false,
  false,
  false
);

-- Add column to client_projects for storing specific request (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_projects' AND column_name = 'specific_request') THEN
    ALTER TABLE public.client_projects ADD COLUMN specific_request TEXT;
  END IF;
END $$;