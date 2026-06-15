-- Create default KPI definitions if they don't exist
INSERT INTO public.kpi_definitions (key, label, description, applies_to, chart_type, order_index, enabled)
VALUES 
  ('leads_generated', 'Lead Generati', 'Numero totale di lead generati', 'PARTNER', 'number', 1, true),
  ('conversion_rate', 'Tasso di Conversione %', 'Percentuale di conversione lead', 'PARTNER', 'number', 2, true),
  ('revenue_monthly', 'Fatturato Mensile (€)', 'Fatturato mensile in EUR', 'PARTNER', 'bar', 3, true),
  ('client_satisfaction', 'Soddisfazione Cliente', 'Punteggio medio soddisfazione (1-10)', 'PARTNER', 'number', 4, true),
  ('interviews_completed', 'Colloqui Completati', 'Numero di colloqui effettuati', 'ASSOCIATE', 'number', 1, true),
  ('placement_rate', 'Tasso di Placement %', 'Percentuale di placement riusciti', 'ASSOCIATE', 'number', 2, true),
  ('cv_submissions', 'CV Inviati', 'Numero di CV inviati alle aziende', 'ASSOCIATE', 'bar', 3, true),
  ('skills_score', 'Punteggio Competenze', 'Valutazione media competenze (1-100)', 'ASSOCIATE', 'number', 4, true)
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  chart_type = EXCLUDED.chart_type,
  order_index = EXCLUDED.order_index;

-- Ensure RLS policies for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = auth.uid());

-- Ensure RLS policies for login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;
CREATE POLICY "Anyone can insert login attempts" 
ON public.login_attempts 
FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view login attempts" ON public.login_attempts;
CREATE POLICY "Admins can view login attempts" 
ON public.login_attempts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'ADMIN' 
    AND profiles.status = 'approved'
  )
);

-- Note for admin user creation:
-- The admin user must be created through the Supabase Auth interface or API
-- with email: Careerpilot2025@gmail.com
-- Once created, run this query to make them an admin:
-- UPDATE public.profiles SET role = 'ADMIN', status = 'approved' WHERE email = 'Careerpilot2025@gmail.com';