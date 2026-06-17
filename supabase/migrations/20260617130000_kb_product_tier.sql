-- Knowledge Base: add a "tier" classification to kb_products.
--
-- Context: the KB is being moved inside the Talent Pool. Material must now be
-- split across four tiers so the right audience sees the right content:
--   • Internship Placement  -> shown to STUDENTS in the Talent Pool ("Prep Material")
--   • High School / Uni     -> shown to CLIENTS in their personal area (Knowledge Base)
--   • Uni / Master          -> shown to CLIENTS in their personal area (Knowledge Base)
--   • Transfer / Layover    -> shown to CLIENTS in their personal area (Knowledge Base)
--
-- The legacy `category` column (Take Off & Layover / Summit / Altitude) is KEPT
-- untouched so no existing data, orders or client access is lost. `tier` is an
-- additive column; existing rows are backfilled from their category below.

ALTER TABLE public.kb_products
  ADD COLUMN IF NOT EXISTS tier text;

-- Backfill tier ONLY where the category maps unambiguously to a single tier.
--   Altitude            -> Internship Placement   (verified: all live products are internship/finance prep)
--   Summit              -> Uni / Master
--   Take Off            -> High School / Uni       (defensive: this value does not currently exist)
--
-- IMPORTANT: 'Take Off & Layover' is deliberately LEFT NULL. That single category
-- merges two distinct tiers (Take Off = High School / Uni, Layover = Transfer /
-- Layover) and nothing in the data distinguishes them, so any bulk mapping would
-- mislabel one half. The admin re-tags each such product by hand. Leaving NULL is
-- safe: the client store shows ALL products (not filtered by tier), so NULL-tier
-- products stay visible/purchasable; the student "Prep Material" store filters on
-- tier = 'Internship Placement', so NULL-tier products are correctly excluded there.
UPDATE public.kb_products SET tier = 'Internship Placement'
  WHERE category = 'Altitude' AND tier IS NULL;
UPDATE public.kb_products SET tier = 'Uni / Master'
  WHERE category = 'Summit' AND tier IS NULL;
UPDATE public.kb_products SET tier = 'High School / Uni'
  WHERE category = 'Take Off' AND tier IS NULL;

-- Constrain tier to the four supported values. NULL stays allowed so an admin can
-- create a product and assign its tier later without breaking the insert.
ALTER TABLE public.kb_products
  DROP CONSTRAINT IF EXISTS kb_products_tier_check;
ALTER TABLE public.kb_products
  ADD CONSTRAINT kb_products_tier_check
  CHECK (
    tier IS NULL OR tier IN (
      'Internship Placement',
      'High School / Uni',
      'Uni / Master',
      'Transfer / Layover'
    )
  );

-- Helps the per-tier catalog queries (Talent Pool prep material vs client KB).
CREATE INDEX IF NOT EXISTS kb_products_tier_idx ON public.kb_products (tier);
