-- Fix linter: Function Search Path Mutable
-- Set an explicit search_path on functions that previously omitted it.

CREATE OR REPLACE FUNCTION public.get_pathways_admin_threads()
RETURNS TABLE(
  student_id uuid,
  student_name text,
  student_email text,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as student_id,
    COALESCE(u.first_name || ' ' || u.last_name, u.email) as student_name,
    u.email as student_email,
    (
      SELECT message 
      FROM pathways_messages 
      WHERE (sender_id = u.id OR recipient_id = u.id)
      ORDER BY created_at DESC 
      LIMIT 1
    ) as last_message,
    (
      SELECT created_at 
      FROM pathways_messages 
      WHERE (sender_id = u.id OR recipient_id = u.id)
      ORDER BY created_at DESC 
      LIMIT 1
    ) as last_message_at,
    (
      SELECT COUNT(*)
      FROM pathways_messages
      WHERE sender_id = u.id 
        AND sender_role = 'STUDENT'
        AND is_read = false
    ) as unread_count
  FROM pathways_users u
  WHERE u.role = 'STUDENT'
    AND EXISTS (
      SELECT 1 FROM pathways_messages 
      WHERE sender_id = u.id OR recipient_id = u.id
    )
  ORDER BY last_message_at DESC NULLS LAST;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_pathways_student_threads(student_user_id uuid)
RETURNS TABLE(
  thread_id uuid,
  last_message text,
  last_message_at timestamp with time zone,
  unread_count bigint,
  admin_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    m.id as thread_id,
    m.message as last_message,
    m.created_at as last_message_at,
    COUNT(*) FILTER (WHERE m.is_read = false AND m.sender_role = 'ADMIN') as unread_count,
    'Career Pilot Support'::TEXT as admin_name
  FROM pathways_messages m
  WHERE (m.sender_id = student_user_id OR m.recipient_id = student_user_id)
  GROUP BY m.id, m.message, m.created_at
  ORDER BY m.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_talent_pool_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Generate payment reference for students upon approval
  IF NEW.role = 'STUDENT' AND NEW.registration_status = 'APPROVED' AND OLD.registration_status != 'APPROVED' THEN
    UPDATE student_profiles 
    SET payment_reference = 'CP-' || SUBSTRING(NEW.id::TEXT, 1, 8) || '-' || TO_CHAR(NOW(), 'YYYYMMDD'),
        payment_status = 'AWAITING_VERIFICATION'
    WHERE user_id = NEW.id;
  END IF;
  
  -- Log the status change
  INSERT INTO talent_pool_logs (actor_id, action, target_type, target_id, payload)
  VALUES (
    auth.uid(),
    'REGISTRATION_STATUS_CHANGE',
    'USER',
    NEW.id,
    jsonb_build_object(
      'old_status', OLD.registration_status,
      'new_status', NEW.registration_status,
      'role', NEW.role
    )
  );
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_pathways_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_talent_pool_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;