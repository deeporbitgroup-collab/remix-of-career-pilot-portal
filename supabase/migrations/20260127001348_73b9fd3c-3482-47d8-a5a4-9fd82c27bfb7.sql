-- Insert Associate Office Hours service for Take Off
INSERT INTO public.client_services (name, category, subcategory, description, price, requires_university, requires_sector, requires_associate)
VALUES (
  'Associate Office Hours',
  'Take Off',
  'High School to University',
  'Call online di 60 minuti con un Associate. Chiedi qualsiasi cosa su SAT, GMAT, interview prep, studio e molto altro.',
  50.00,
  true,
  false,
  true
);

-- Insert Associate Office Hours service for Layover
INSERT INTO public.client_services (name, category, subcategory, description, price, requires_university, requires_sector, requires_associate)
VALUES (
  'Associate Office Hours',
  'Layover',
  'University Transfers',
  'Call online di 60 minuti con un Associate. Chiedi qualsiasi cosa su SAT, GMAT, interview prep, studio e molto altro.',
  60.00,
  true,
  false,
  true
);

-- Insert Associate Office Hours service for Summit
INSERT INTO public.client_services (name, category, subcategory, description, price, requires_university, requires_sector, requires_associate)
VALUES (
  'Associate Office Hours',
  'Summit',
  'Master Degree',
  'Call online di 60 minuti con un Associate. Chiedi qualsiasi cosa su SAT, GMAT, interview prep, studio e molto altro.',
  90.00,
  false,
  false,
  true
);