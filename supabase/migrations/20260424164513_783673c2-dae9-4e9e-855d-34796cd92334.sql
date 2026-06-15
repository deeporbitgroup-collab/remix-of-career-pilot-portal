-- Update CV/Cover/Interview service: rename and change description
UPDATE public.client_services
SET 
  name = 'CV / Cover Letter Rewrite',
  description = 'Choose an Associate working in your target sector who will rewrite your CV or your Cover Letter (your choice) to make it stand out. The Associate uses their first-hand industry experience to optimize wording, structure, keywords, and impact, tailored to the roles you are targeting.',
  requires_associate = true,
  requires_sector = true,
  requires_university = false
WHERE id = '50956661-113d-4890-b104-e730040037b2';

-- Insert new Masterclass service (price on request → 0)
INSERT INTO public.client_services (
  category, name, description, price,
  requires_associate, requires_sector, requires_university
) VALUES (
  'Altitude',
  'Masterclass Managed by CareerBoost',
  'An industry expert guides you through a deep, practical introduction to your target sector — covering how the industry actually works day-to-day, key concepts, real-world cases and hands-on exercises. At the end of the masterclass you receive an official certificate of completion.\n\nPrice on request: contact us on WhatsApp to receive a personalized quote based on your sector, format and group size.',
  0,
  false,
  false,
  false
);