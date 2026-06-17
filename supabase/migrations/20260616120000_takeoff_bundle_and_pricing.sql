-- Take Off restructure: add discounted "Take Off Package" bundle + update Take Off à-la-carte prices.
-- SCOPE: only category = 'Take Off'. Summit / Altitude / Layover rows are NOT touched.
-- Prices are per-row-per-category, so the WHERE category = 'Take Off' clauses are safe.

-- 1) Update Take Off à-la-carte prices
UPDATE public.client_services SET price = 150 WHERE category = 'Take Off' AND name = 'Personalized Timeline';
UPDATE public.client_services SET price = 120 WHERE category = 'Take Off' AND name = 'In-Depth Presentations';
UPDATE public.client_services SET price = 70  WHERE category = 'Take Off' AND name = 'Associate Office Hours';
UPDATE public.client_services SET price = 70  WHERE category = 'Take Off' AND name = 'Comparative Presentations';

-- 2) Insert the Take Off Package bundle (idempotent: only if it does not already exist)
INSERT INTO public.client_services
  (name, category, subcategory, description, price, requires_university, requires_sector, requires_associate, is_subscription)
SELECT
  'Take Off Package',
  'Take Off',
  'High School to University',
  'All-in-one Take Off bundle: Personalized Timeline (with Study Plan), one In-Depth Presentation and 2 Associate Office Hours — guided 1:1 by a student from your University of Interest. Save ~15% vs buying separately.',
  350,
  true,   -- requires_university (associate filtered by University of Interest)
  false,  -- requires_sector
  true,   -- requires_associate
  false   -- is_subscription
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_services WHERE category = 'Take Off' AND name = 'Take Off Package'
);
