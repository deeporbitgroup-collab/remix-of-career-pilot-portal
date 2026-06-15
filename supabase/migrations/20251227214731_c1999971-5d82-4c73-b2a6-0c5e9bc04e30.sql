-- Create client password resets table
CREATE TABLE IF NOT EXISTS public.client_password_resets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.client_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_password_resets ENABLE ROW LEVEL SECURITY;

-- Create index for token lookup
CREATE INDEX idx_client_password_resets_token ON public.client_password_resets(token);
CREATE INDEX idx_client_password_resets_client_id ON public.client_password_resets(client_id);