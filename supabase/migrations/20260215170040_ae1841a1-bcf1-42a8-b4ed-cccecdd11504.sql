
-- Audit trail for KB admin actions
CREATE TABLE public.kb_admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Login attempts tracking for rate limiting
CREATE TABLE public.kb_login_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_login_attempts ENABLE ROW LEVEL SECURITY;

-- No public RLS policies - these are accessed via service role in edge functions only
