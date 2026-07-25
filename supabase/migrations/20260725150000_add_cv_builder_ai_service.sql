-- New Altitude service: "CV Builder AI" — self-serve AI CV builder/rewriter
-- at /cv-builder. Free during the beta (price 0), no associate required.
-- Special-cased in src/pages/client-portal/ClientServices.tsx to open
-- /cv-builder in a new tab instead of the normal "Select Associate" flow
-- (never added to cart/checkout).
--
-- Idempotent: skips if a service with this name already exists.

INSERT INTO public.client_services
  (name, category, description, price, requires_university, requires_sector, requires_associate, is_subscription, is_call_service)
SELECT
  'CV Builder AI', 'Altitude',
  'Answer a few quick questions or paste your current CV — our AI instantly rewrites and formats it into a polished, professional one-page CV, ready to download. Free during our beta.',
  0, false, false, false, false, false
WHERE NOT EXISTS (
  SELECT 1 FROM public.client_services WHERE name = 'CV Builder AI'
);
