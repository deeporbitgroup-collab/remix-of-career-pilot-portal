-- Fix delete_user_completely function to handle all user statuses
DROP FUNCTION IF EXISTS public.delete_user_completely(uuid);

CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  user_role_type user_role;
BEGIN
  -- Check if the calling user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role = 'ADMIN'::user_role
    -- Remove status check to allow admins to delete any user regardless of their status
  ) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;

  -- Get the role of the user to be deleted
  SELECT role INTO user_role_type FROM profiles WHERE id = user_id;
  
  -- Check if user exists
  IF user_role_type IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Delete from storage (documents) - for Associates
  DELETE FROM storage.objects 
  WHERE bucket_id = 'documents' 
  AND owner = user_id;

  -- Delete from storage (partner-documents) - for Partners
  DELETE FROM storage.objects 
  WHERE bucket_id = 'partner-documents' 
  AND (owner = user_id OR name LIKE user_id::text || '/%');

  -- Delete documents (Associates)
  DELETE FROM documents WHERE documents.user_id = delete_user_completely.user_id;

  -- Delete partner documents (Partners)
  DELETE FROM partner_documents WHERE partner_id = delete_user_completely.user_id OR uploaded_by = delete_user_completely.user_id;

  -- Delete availability slots (Associates)
  DELETE FROM availability_slots WHERE availability_slots.user_id = delete_user_completely.user_id;

  -- Delete notifications
  DELETE FROM notifications WHERE notifications.user_id = delete_user_completely.user_id;

  -- Delete KPI values
  DELETE FROM kpi_values WHERE kpi_values.user_id = delete_user_completely.user_id;

  -- Delete consultations (Partners)
  DELETE FROM consultations WHERE partner_id = delete_user_completely.user_id;

  -- Delete profile (this will cascade to auth.users due to foreign key)
  DELETE FROM profiles WHERE id = delete_user_completely.user_id;
  
  -- Finally, delete from auth.users
  DELETE FROM auth.users WHERE id = delete_user_completely.user_id;
END;
$function$;