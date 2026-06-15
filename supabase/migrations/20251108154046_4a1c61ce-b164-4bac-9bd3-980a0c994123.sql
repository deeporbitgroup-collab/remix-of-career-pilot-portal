-- Tighten student selection SELECT policy and enable realtime replication

DROP POLICY IF EXISTS "Students can view companies that selected them" ON public.company_selected_students;

CREATE POLICY "Students can view companies that selected them"
ON public.company_selected_students
FOR SELECT
USING (student_id = auth.uid());

-- Ensure realtime changes stream contains full row data
ALTER TABLE public.company_selected_students REPLICA IDENTITY FULL;