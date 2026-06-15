-- Add missing fields to pathways_applications for tracking
ALTER TABLE pathways_applications 
ADD COLUMN IF NOT EXISTS organization_name TEXT,
ADD COLUMN IF NOT EXISTS notified_student BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_via TEXT DEFAULT 'opportunities_catalog_apply_button';

-- Add index for better performance on student queries
CREATE INDEX IF NOT EXISTS idx_pathways_applications_user_id 
ON pathways_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_pathways_applications_status 
ON pathways_applications(status);

-- Add indexes for messaging performance
CREATE INDEX IF NOT EXISTS idx_pathways_messages_recipient_id 
ON pathways_messages(recipient_id);

CREATE INDEX IF NOT EXISTS idx_pathways_messages_sender_id 
ON pathways_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_pathways_messages_created_at 
ON pathways_messages(created_at DESC);

-- Function to get latest message for each conversation
CREATE OR REPLACE FUNCTION get_pathways_student_threads(student_user_id UUID)
RETURNS TABLE (
  thread_id UUID,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT,
  admin_name TEXT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get latest message for admin dashboard
CREATE OR REPLACE FUNCTION get_pathways_admin_threads()
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  last_message TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count BIGINT
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;