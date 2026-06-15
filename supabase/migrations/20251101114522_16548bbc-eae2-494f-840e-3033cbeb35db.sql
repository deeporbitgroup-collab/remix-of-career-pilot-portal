-- Create table for company selected students
CREATE TABLE IF NOT EXISTS public.company_selected_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.talent_pool_users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.talent_pool_users(id) ON DELETE CASCADE,
  selected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, student_id)
);

-- Enable RLS
ALTER TABLE public.company_selected_students ENABLE ROW LEVEL SECURITY;

-- Companies can view their own selections
CREATE POLICY "Companies can view their selections"
  ON public.company_selected_students
  FOR SELECT
  USING (
    company_id = auth.uid() OR
    is_talent_pool_admin(auth.uid())
  );

-- Companies can insert their own selections
CREATE POLICY "Companies can create selections"
  ON public.company_selected_students
  FOR INSERT
  WITH CHECK (company_id = auth.uid());

-- Admin can view all selections
CREATE POLICY "Admin can view all selections"
  ON public.company_selected_students
  FOR SELECT
  USING (is_talent_pool_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_selected_students_company_id 
  ON public.company_selected_students(company_id);
CREATE INDEX IF NOT EXISTS idx_company_selected_students_student_id 
  ON public.company_selected_students(student_id);

-- Add notifications table column for selection notifications if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'talent_pool_notifications') THEN
    CREATE TABLE public.talent_pool_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES public.talent_pool_users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      data JSONB,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    ALTER TABLE public.talent_pool_notifications ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view their notifications"
      ON public.talent_pool_notifications
      FOR SELECT
      USING (user_id = auth.uid() OR is_talent_pool_admin(auth.uid()));
      
    CREATE POLICY "System can create notifications"
      ON public.talent_pool_notifications
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;