-- Add missing columns to client_cart table
ALTER TABLE public.client_cart 
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT;

-- Update client_services table structure if needed
ALTER TABLE public.client_services 
ADD COLUMN IF NOT EXISTS requires_associate BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_subscription BOOLEAN DEFAULT false;

-- Add order_id column to client_projects if missing for proper relationship
ALTER TABLE public.client_projects 
ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES client_orders(id) ON DELETE SET NULL;