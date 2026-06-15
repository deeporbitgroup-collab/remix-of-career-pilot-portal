-- Create admin function to fetch all company->student selections with names
CREATE OR REPLACE FUNCTION public.admin_get_company_selections()
RETURNS TABLE(
  id uuid,
  company_id uuid,
  student_id uuid,
  selected_at timestamp with time zone,
  created_at timestamp with time zone,
  company_name text,
  student_first_name text,
  student_last_name text,
  student_email text
) AS $$
  SELECT
    css.id,
    css.company_id,
    css.student_id,
    css.selected_at,
    css.created_at,
    cp.company_name,
    sp.first_name AS student_first_name,
    sp.last_name AS student_last_name,
    tpu.email AS student_email
  FROM public.company_selected_students css
  LEFT JOIN public.company_profiles cp ON cp.user_id = css.company_id
  LEFT JOIN public.student_profiles sp ON sp.user_id = css.student_id
  LEFT JOIN public.talent_pool_users tpu ON tpu.id = css.student_id
  ORDER BY css.selected_at DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;