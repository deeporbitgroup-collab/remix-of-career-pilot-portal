/*
  PACKAGES RESTRUCTURE
  Move from "single services" to a "packages" model.
    - 4 fixed-price packages (Take Off / Summit / Altitude / Layover)
    - each package = real product components with an admin-editable INTERNAL
      price; the sum of non-add-on components MUST equal the package price
    - removable components (price drops) + add-ons (price rises)
    - descriptive-only bullets (Study Plan / Entry Plan) live as text, not rows
  The a-la-carte service rows stay for "scorporo" (buy singles at listino).
*/

/* 0) Align a-la-carte listino prices with the catalog (source of truth for scorporo). */
-- Take Off
UPDATE public.client_services SET price = 120 WHERE category = 'Take Off' AND name = 'Personalized Timeline';
UPDATE public.client_services SET price = 80  WHERE category = 'Take Off' AND name = 'In-Depth Presentations';
UPDATE public.client_services SET price = 60  WHERE category = 'Take Off' AND name = 'Associate Office Hours';
UPDATE public.client_services SET price = 110 WHERE category = 'Take Off' AND name = 'Comparative Presentations';

-- Summit
UPDATE public.client_services SET price = 180 WHERE category = 'Summit' AND name = 'Personalized Timeline';
UPDATE public.client_services SET price = 120 WHERE category = 'Summit' AND name = 'CV Rewriting / Cover Letter Rewriting';
UPDATE public.client_services SET price = 100 WHERE category = 'Summit' AND name = 'In-Depth Presentations';
UPDATE public.client_services SET price = 100 WHERE category = 'Summit' AND name = 'Associate Office Hours';
UPDATE public.client_services SET price = 130 WHERE category = 'Summit' AND name = 'Comparative Analysis';

-- Altitude
UPDATE public.client_services SET price = 230 WHERE category = 'Altitude' AND name = 'Personalized Career Roadmap';
UPDATE public.client_services SET price = 90  WHERE category = 'Altitude' AND name = 'CV / Cover Letter Rewrite';
UPDATE public.client_services SET price = 60  WHERE category = 'Altitude' AND name = 'Career Insights';
UPDATE public.client_services SET price = 90  WHERE category = 'Altitude' AND name = 'Expert Career Session';
UPDATE public.client_services SET price = 250 WHERE category = 'Altitude' AND name = 'Outreach Power Pack — Pay Per Interview';

-- Layover
UPDATE public.client_services SET price = 50  WHERE category = 'Layover' AND name = 'University Eligibility Verification';
UPDATE public.client_services SET price = 140 WHERE category = 'Layover' AND name = 'Personalized Timeline';
UPDATE public.client_services SET price = 90  WHERE category = 'Layover' AND name = 'In-Depth Presentations';
UPDATE public.client_services SET price = 70  WHERE category = 'Layover' AND name = 'Associate Office Hours';
UPDATE public.client_services SET price = 120 WHERE category = 'Layover' AND name = 'Comparative Presentations';

-- Remove the old standalone "Take Off Package" service row (now modelled in
-- client_packages instead). Safe no-op if it was never inserted.
DELETE FROM public.client_services WHERE category = 'Take Off' AND name = 'Take Off Package';

-- Label a project with the package it was bought as part of (NULL = à-la-carte).
-- Lets the Crew Portal and My Flight Plan group per-component projects under the package.
ALTER TABLE public.client_projects ADD COLUMN IF NOT EXISTS package_name TEXT;

-- ----------------------------------------------------------------------------
-- 1) Schema: client_packages + client_package_components
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_packages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_name   TEXT NOT NULL,                 -- UI codename, e.g. "Take Off"
  subtitle    TEXT NOT NULL,                 -- e.g. "Highschool to University"
  category    TEXT NOT NULL,                 -- vertical link: Take Off / Summit / Altitude / Layover
  description TEXT,
  price       DECIMAL(10,2) NOT NULL,        -- FIXED total (source of truth)
  bullets     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- descriptive-only bullets [{label, info}]
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_package_components (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id     UUID NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  service_id     UUID REFERENCES public.client_services(id) ON DELETE SET NULL, -- real product
  label          TEXT,                       -- display override (e.g. "2× Associate Office Hours")
  quantity       INTEGER NOT NULL DEFAULT 1,
  internal_price DECIMAL(10,2) NOT NULL DEFAULT 0,   -- admin-editable, PER UNIT
  is_removable   BOOLEAN NOT NULL DEFAULT false,
  is_addon       BOOLEAN NOT NULL DEFAULT false,
  addon_type     TEXT,                       -- null | 'comparative' | 'outreach'
  addon_price    DECIMAL(10,2),              -- surcharge for add-ons (per-interview unit for outreach)
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_package_components_package_id
  ON public.client_package_components(package_id);

-- ----------------------------------------------------------------------------
-- 2) Integrity: sum(non-add-on internal_price * quantity) MUST equal package.price
--    Deferred so seeding/admin edits validate at COMMIT, not row-by-row.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_client_package_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pid       UUID;
  pkg_price NUMERIC;
  comp_sum  NUMERIC;
BEGIN
  IF TG_TABLE_NAME = 'client_packages' THEN
    pid := NEW.id;
  ELSE
    pid := COALESCE(NEW.package_id, OLD.package_id);
  END IF;

  SELECT price INTO pkg_price FROM public.client_packages WHERE id = pid;
  IF pkg_price IS NULL THEN
    RETURN NULL; -- package deleted; cascade removes components
  END IF;

  SELECT COALESCE(SUM(internal_price * quantity), 0) INTO comp_sum
  FROM public.client_package_components
  WHERE package_id = pid AND is_addon = false;

  IF comp_sum <> pkg_price THEN
    RAISE EXCEPTION
      'Package % component sum (%) must equal package price (%)', pid, comp_sum, pkg_price;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_validate_package_components
  AFTER INSERT OR UPDATE OR DELETE ON public.client_package_components
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_package_total();

CREATE CONSTRAINT TRIGGER trg_validate_package_price
  AFTER UPDATE OF price ON public.client_packages
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_package_total();

-- ----------------------------------------------------------------------------
-- 3) RLS (mirror the permissive client_* pattern: public read, open write)
-- ----------------------------------------------------------------------------
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_package_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Packages visible to all" ON public.client_packages
  FOR SELECT USING (true);
CREATE POLICY "Package admin operations" ON public.client_packages
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Package components visible to all" ON public.client_package_components
  FOR SELECT USING (true);
CREATE POLICY "Package component admin operations" ON public.client_package_components
  FOR ALL USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4) Seed the 4 packages + components (internal prices sum to each total)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pkg_id UUID;
  svc    UUID;
BEGIN
  -- helper note: service_id resolved by (category, name); NULL if not found.

  -- TAKE OFF - 350 EUR
  IF NOT EXISTS (SELECT 1 FROM public.client_packages WHERE category = 'Take Off') THEN
    INSERT INTO public.client_packages (code_name, subtitle, category, description, price, sort_order, bullets)
    VALUES (
      'Take Off', 'Highschool to University', 'Take Off',
      'Everything you need to go from High School to your target University, guided 1:1 by a student already there. One fixed price, one Associate who manages everything.',
      350, 1,
      '[
        {"label": "Study Plan", "info": "A structured plan of what to study and when, to prepare for entrance tests — already part of your Personalized Timeline. Includes discounted access to the best preparation resources."},
        {"label": "Projects presented live online by your Associate", "info": "Your Associate walks you through every deliverable in live 1:1 online sessions — nothing is just a file you read on your own."},
        {"label": "Dedicated WhatsApp group with your Associate", "info": "A private WhatsApp group with you, your Associate and a Career Pilot supervisor, for ongoing support throughout your whole journey."}
      ]'::jsonb
    ) RETURNING id INTO pkg_id;

    SELECT id INTO svc FROM public.client_services WHERE category = 'Take Off' AND name = 'Personalized Timeline' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'Personalized Timeline', 1, 150, false, 1);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Take Off' AND name = 'In-Depth Presentations' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'In-Depth Presentation', 1, 100, true, 2);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Take Off' AND name = 'Associate Office Hours' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, '2x Associate Office Hours', 2, 50, true, 3);

    -- add-on: Comparative Presentations (+110, 2nd university + 2nd associate)
    SELECT id INTO svc FROM public.client_services WHERE category = 'Take Off' AND name = 'Comparative Presentations' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, is_addon, addon_type, addon_price, sort_order)
    VALUES (pkg_id, svc, 'Comparative Presentations', 1, 0, false, true, 'comparative', 110, 4);
  END IF;

  -- ===================== SUMMIT — 600€ =====================
  IF NOT EXISTS (SELECT 1 FROM public.client_packages WHERE category = 'Summit') THEN
    INSERT INTO public.client_packages (code_name, subtitle, category, description, price, sort_order, bullets)
    VALUES (
      'Summit', 'University to Master', 'Summit',
      'From University to your target Master — guided 1:1 by a student already in the program. One fixed price, one Associate who manages everything.',
      600, 2,
      '[
        {"label": "Study Plan", "info": "A structured plan of what to study and when to prepare for admission tests — already part of your Personalized Timeline."},
        {"label": "Projects presented live online by your Associate", "info": "Your Associate walks you through every deliverable in live 1:1 online sessions."},
        {"label": "Dedicated WhatsApp group with your Associate", "info": "A private WhatsApp group with you, your Associate and a Career Pilot supervisor."}
      ]'::jsonb
    ) RETURNING id INTO pkg_id;

    SELECT id INTO svc FROM public.client_services WHERE category = 'Summit' AND name = 'Personalized Timeline' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'Personalized Timeline', 1, 180, false, 1);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Summit' AND name = 'CV Rewriting / Cover Letter Rewriting' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'CV / Cover Letter Rewriting', 1, 120, true, 2);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Summit' AND name = 'In-Depth Presentations' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'In-Depth Presentation', 1, 100, true, 3);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Summit' AND name = 'Associate Office Hours' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, '2× Associate Office Hours', 2, 100, true, 4);

    -- add-on: Comparative Analysis (+130)
    SELECT id INTO svc FROM public.client_services WHERE category = 'Summit' AND name = 'Comparative Analysis' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, is_addon, addon_type, addon_price, sort_order)
    VALUES (pkg_id, svc, 'Comparative Analysis', 1, 0, false, true, 'comparative', 130, 5);
  END IF;

  -- ===================== ALTITUDE — 600€ =====================
  IF NOT EXISTS (SELECT 1 FROM public.client_packages WHERE category = 'Altitude') THEN
    INSERT INTO public.client_packages (code_name, subtitle, category, description, price, sort_order, bullets)
    VALUES (
      'Altitude', 'Internship Placement', 'Altitude',
      'A complete internship-placement program guided 1:1 by a professional in your target field. One fixed price, one Associate who manages everything.',
      600, 3,
      '[
        {"label": "Entry Plan", "info": "A practical step-by-step plan to break into your target role — already part of your Personalized Career Roadmap."},
        {"label": "Projects presented live online by your Associate", "info": "Your Associate walks you through every deliverable in live 1:1 online sessions."},
        {"label": "Dedicated WhatsApp group with your Associate", "info": "A private WhatsApp group with you, your Associate and a Career Pilot supervisor."}
      ]'::jsonb
    ) RETURNING id INTO pkg_id;

    SELECT id INTO svc FROM public.client_services WHERE category = 'Altitude' AND name = 'Personalized Career Roadmap' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'Personalized Career Roadmap', 1, 250, false, 1);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Altitude' AND name = 'CV / Cover Letter Rewrite' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'CV / Cover Letter Rewrite', 1, 95, true, 2);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Altitude' AND name = 'Career Insights' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'Career Insights', 1, 65, true, 3);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Altitude' AND name = 'Expert Career Session' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, '2× Expert Career Session', 2, 95, true, 4);

    -- add-on: Outreach Power Pack — pay-per-interview (0€ upfront, 250€/interview, no cap)
    SELECT id INTO svc FROM public.client_services WHERE category = 'Altitude' AND name = 'Outreach Power Pack — Pay Per Interview' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, is_addon, addon_type, addon_price, sort_order)
    VALUES (pkg_id, svc, 'Outreach Power Pack (pay-per-interview)', 1, 0, false, true, 'outreach', 250, 5);
  END IF;

  -- ===================== LAYOVER — 450€ =====================
  IF NOT EXISTS (SELECT 1 FROM public.client_packages WHERE category = 'Layover') THEN
    INSERT INTO public.client_packages (code_name, subtitle, category, description, price, sort_order, bullets)
    VALUES (
      'Layover', 'University Transfer', 'Layover',
      'Everything you need to transfer to your target University — including eligibility verification — guided 1:1 by a student already there. One fixed price, one Associate who manages everything.',
      450, 4,
      '[
        {"label": "Study Plan", "info": "A structured plan of what to study and when — already part of your Personalized Timeline."},
        {"label": "Projects presented live online by your Associate", "info": "Your Associate walks you through every deliverable in live 1:1 online sessions."},
        {"label": "Dedicated WhatsApp group with your Associate", "info": "A private WhatsApp group with you, your Associate and a Career Pilot supervisor."}
      ]'::jsonb
    ) RETURNING id INTO pkg_id;

    SELECT id INTO svc FROM public.client_services WHERE category = 'Layover' AND name = 'University Eligibility Verification' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'University Eligibility Verification', 1, 55, true, 1);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Layover' AND name = 'Personalized Timeline' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'Personalized Timeline', 1, 150, false, 2);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Layover' AND name = 'In-Depth Presentations' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, 'In-Depth Presentation', 1, 95, true, 3);

    SELECT id INTO svc FROM public.client_services WHERE category = 'Layover' AND name = 'Associate Office Hours' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, sort_order)
    VALUES (pkg_id, svc, '2× Associate Office Hours', 2, 75, true, 4);

    -- add-on: Comparative Presentations (+120)
    SELECT id INTO svc FROM public.client_services WHERE category = 'Layover' AND name = 'Comparative Presentations' LIMIT 1;
    INSERT INTO public.client_package_components (package_id, service_id, label, quantity, internal_price, is_removable, is_addon, addon_type, addon_price, sort_order)
    VALUES (pkg_id, svc, 'Comparative Presentations', 1, 0, false, true, 'comparative', 120, 5);
  END IF;
END $$;

/*
  Force Take Off to 350 EUR on databases seeded BEFORE the price change.
  The seed block above is guarded by IF NOT EXISTS, so an existing row keeps its
  old 250 price. This block does NOT rely on matching service names (which can
  differ between databases): it computes the gap between the current component
  sum and 350, then adds the difference onto the anchor (non-removable) component.
  The deferred trigger validates everything together at COMMIT.
*/
SET CONSTRAINTS ALL DEFERRED;
DO $$
DECLARE
  pid    UUID;
  cur    NUMERIC;
  diff   NUMERIC;
  target UUID;
  tqty   INTEGER;
BEGIN
  SELECT id INTO pid FROM public.client_packages WHERE category = 'Take Off' ORDER BY sort_order LIMIT 1;
  IF pid IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(internal_price * quantity), 0) INTO cur
  FROM public.client_package_components WHERE package_id = pid AND is_addon = false;

  diff := 350 - cur;

  -- Absorb the difference into the anchor component (prefer the non-removable one).
  SELECT id, quantity INTO target, tqty
  FROM public.client_package_components
  WHERE package_id = pid AND is_addon = false
  ORDER BY is_removable ASC, sort_order ASC
  LIMIT 1;

  IF target IS NOT NULL AND diff <> 0 THEN
    UPDATE public.client_package_components
    SET internal_price = internal_price + (diff / GREATEST(tqty, 1))
    WHERE id = target;
  END IF;

  UPDATE public.client_packages SET price = 350 WHERE id = pid;
END $$;
