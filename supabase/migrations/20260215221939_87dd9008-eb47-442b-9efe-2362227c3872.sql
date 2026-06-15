
-- Add bundle support to kb_products
ALTER TABLE public.kb_products ADD COLUMN IF NOT EXISTS is_bundle boolean NOT NULL DEFAULT false;
ALTER TABLE public.kb_products ADD COLUMN IF NOT EXISTS bundle_product_ids uuid[] DEFAULT '{}';
