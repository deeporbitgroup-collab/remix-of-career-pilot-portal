-- Create password reset table for Pathways
CREATE TABLE IF NOT EXISTS public.pathways_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.pathways_users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pathways_password_resets ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can request password reset
CREATE POLICY "Anyone can request password reset"
ON public.pathways_password_resets
FOR INSERT
WITH CHECK (true);

-- Policy: Users can view own reset tokens
CREATE POLICY "Users can view own reset tokens"
ON public.pathways_password_resets
FOR SELECT
USING (user_id = auth.uid());

-- Policy: System can update tokens (mark as used)
CREATE POLICY "System can update reset tokens"
ON public.pathways_password_resets
FOR UPDATE
USING (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pathways_password_resets_token ON public.pathways_password_resets(token);
CREATE INDEX IF NOT EXISTS idx_pathways_password_resets_user_id ON public.pathways_password_resets(user_id);