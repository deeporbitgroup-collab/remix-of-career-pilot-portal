
-- Create updated_at function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Knowledge Base products table
CREATE TABLE public.kb_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('Take Off & Layover', 'Summit', 'Altitude')),
  price numeric NOT NULL CHECK (price >= 0),
  asset_storage_path text,
  asset_filename text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active kb products" ON public.kb_products
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access kb products" ON public.kb_products
  FOR ALL USING (true) WITH CHECK (true);

-- KB admin table
CREATE TABLE public.kb_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No public access kb admins" ON public.kb_admins FOR SELECT USING (false);

-- KB orders
CREATE TABLE public.kb_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_users(id),
  total_amount numeric NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_receipt_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KB orders access" ON public.kb_orders FOR ALL USING (true) WITH CHECK (true);

-- KB order items
CREATE TABLE public.kb_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.kb_orders(id),
  product_id uuid NOT NULL REFERENCES public.kb_products(id),
  price numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KB order items access" ON public.kb_order_items FOR ALL USING (true) WITH CHECK (true);

-- KB client access
CREATE TABLE public.kb_client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.client_users(id),
  product_id uuid NOT NULL REFERENCES public.kb_products(id),
  order_id uuid NOT NULL REFERENCES public.kb_orders(id),
  is_blocked boolean NOT NULL DEFAULT false,
  block_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, product_id)
);

ALTER TABLE public.kb_client_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KB client access policy" ON public.kb_client_access FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for KB assets
INSERT INTO storage.buckets (id, name, public) VALUES ('kb-assets', 'kb-assets', false);

CREATE POLICY "Download kb assets" ON storage.objects FOR SELECT USING (bucket_id = 'kb-assets');
CREATE POLICY "Upload kb assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kb-assets');
CREATE POLICY "Delete kb assets" ON storage.objects FOR DELETE USING (bucket_id = 'kb-assets');

-- Triggers
CREATE TRIGGER update_kb_products_updated_at BEFORE UPDATE ON public.kb_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_orders_updated_at BEFORE UPDATE ON public.kb_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
