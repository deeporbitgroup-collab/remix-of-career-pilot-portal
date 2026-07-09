-- Talent Pool "Prep Material": partner services (CareerBoost & LanguageBoost).
--
-- These are shown to STUDENTS in the Talent Pool "Prep Material" tab, below our
-- own CareerPilot packages, as two dedicated sections. Unlike CareerPilot
-- packages (kb_products, which are purchased via the Knowledge Base checkout),
-- partner services are NOT bought inline: the student taps "Send Request" and an
-- email goes out to the student, our team and the partner.
--
-- Admin edits these from the Crew Portal → Talent Pool → "Partner Prep" section.
--
-- Access model mirrors kb_products: anyone can read active rows (the student store
-- runs on the anon key); writes are open at the RLS layer and gated by the admin
-- login, consistent with the existing Knowledge Base admin.

CREATE TABLE IF NOT EXISTS public.tp_partner_services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner       text NOT NULL CHECK (partner IN ('CareerBoost', 'LanguageBoost')),
  title         text NOT NULL,
  description   text,
  target_level  text,                 -- e.g. "For B2 students" / "Beginners"
  -- Pricing. For CareerBoost: price_unit='flat', price = the flat price.
  -- For LanguageBoost: price_unit='per_lesson', lessons + total_price are set and
  -- the per-lesson figure is derived (total_price / lessons) in the UI.
  price_unit    text NOT NULL DEFAULT 'flat' CHECK (price_unit IN ('flat', 'per_lesson')),
  price         numeric,              -- flat price (CareerBoost); NULL = "on request"
  lessons       integer,              -- number of individual lessons (LanguageBoost)
  total_price   numeric,              -- full package total (LanguageBoost); NULL = "on request"
  has_guarantee boolean NOT NULL DEFAULT false,  -- "satisfied-or-refunded guarantee"
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tp_partner_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active partner services"
  ON public.tp_partner_services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access partner services"
  ON public.tp_partner_services
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS tp_partner_services_partner_idx
  ON public.tp_partner_services (partner, sort_order);

-- ===================== SEED =====================

-- CareerBoost (flat price)
INSERT INTO public.tp_partner_services
  (partner, title, description, target_level, price_unit, price, has_guarantee, sort_order)
VALUES
  ('CareerBoost',
   'Mock Interview — M&A Mid Market & Structured Finance',
   'A realistic 1:1 mock interview focused on M&A Mid Market and Structured Finance, run by a CareerBoost professional. Includes technical and fit questions plus detailed, personalized feedback.',
   NULL, 'flat', 60, false, 1),
  ('CareerBoost',
   'Mock Interview — Bulge Bracket & Elite Boutiques (Investment Banking & Global Markets)',
   'A realistic 1:1 mock interview tailored to Bulge Bracket and Elite Boutique recruiting across Investment Banking and Global Markets, run by a CareerBoost professional. Includes technical and fit questions plus detailed, personalized feedback.',
   NULL, 'flat', 95, false, 2);

-- LanguageBoost (per-lesson: lessons + total_price; per-lesson derived in the UI)
INSERT INTO public.tp_partner_services
  (partner, title, description, target_level, price_unit, lessons, total_price, has_guarantee, sort_order)
VALUES
  ('LanguageBoost',
   'LanguageBoost Lessons — BIG3 + Reasoning (with test results)',
   'Individual LanguageBoost lessons focused on the BIG3 tests and reasoning, delivered with test results to track your progress.',
   NULL, 'per_lesson', 50, NULL, false, 1),
  ('LanguageBoost',
   'Cambridge C1 — Satisfied-or-Refunded Guarantee',
   'Individual lessons to reach Cambridge C1, backed by a satisfied-or-refunded guarantee.',
   'For B2 students', 'per_lesson', 50, 1750, true, 2),
  ('LanguageBoost',
   'Cambridge C1 — Satisfied-or-Refunded Guarantee',
   'Individual lessons to reach Cambridge C1, backed by a satisfied-or-refunded guarantee.',
   'For B2+ students', 'per_lesson', 36, 1335, true, 3),
  ('LanguageBoost',
   'Cambridge B2 — Satisfied-or-Refunded Guarantee',
   'Individual lessons to reach Cambridge B2, backed by a satisfied-or-refunded guarantee.',
   'For B1 students', 'per_lesson', 45, 1575, true, 4),
  ('LanguageBoost',
   'IELTS C1 (≥7) — Satisfied-or-Refunded Guarantee',
   'Individual lessons to reach IELTS C1 (band 7 or higher), backed by a satisfied-or-refunded guarantee.',
   'For B2 students', 'per_lesson', 30, 990, true, 5),
  ('LanguageBoost',
   'General English B2',
   'Individual General English lessons to reach a solid B2 level.',
   'For B1 students', 'per_lesson', 45, 1575, false, 6),
  ('LanguageBoost',
   'General English B1 / B1+',
   'Individual General English lessons to reach a B1 / B1+ level.',
   'For A2 students', 'per_lesson', 45, 1575, false, 7),
  ('LanguageBoost',
   'General English A2 / B1',
   'Individual General English lessons to reach an A2 / B1 level.',
   'For A1 students', 'per_lesson', 45, 1450, false, 8),
  ('LanguageBoost',
   'Spanish A1 + A2',
   'Individual Spanish lessons covering levels A1 and A2.',
   'Beginners', 'per_lesson', 30, 990, false, 9),
  ('LanguageBoost',
   'Spanish A1 + A2 + B1',
   'Individual Spanish lessons covering levels A1, A2 and B1.',
   'Beginners', 'per_lesson', 30, 1485, false, 10),
  ('LanguageBoost',
   'Spanish B1',
   'Individual Spanish lessons to reach a B1 level.',
   'For A2 students', 'per_lesson', 15, 495, false, 11),
  ('LanguageBoost',
   'Spanish B2',
   'Individual Spanish lessons to reach a B2 level.',
   'For B1 students', 'per_lesson', 20, 864, false, 12),
  ('LanguageBoost',
   'Spanish C1 or C2',
   'Individual Spanish lessons to reach a C1 or C2 level.',
   'For B2 students', 'per_lesson', 40, 1440, false, 13);
