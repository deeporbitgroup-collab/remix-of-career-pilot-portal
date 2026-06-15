-- Add columns to client_orders for Outreach Power Pack specific data
ALTER TABLE public.client_orders 
ADD COLUMN IF NOT EXISTS outreach_cv_url TEXT,
ADD COLUMN IF NOT EXISTS outreach_cover_letter_url TEXT,
ADD COLUMN IF NOT EXISTS outreach_custom_email TEXT;

-- Add comments for clarity
COMMENT ON COLUMN public.client_orders.outreach_cv_url IS 'CV URL for Outreach Power Pack service';
COMMENT ON COLUMN public.client_orders.outreach_cover_letter_url IS 'Cover Letter URL for Outreach Power Pack service';
COMMENT ON COLUMN public.client_orders.outreach_custom_email IS 'Custom email text for Outreach Power Pack service (optional)';