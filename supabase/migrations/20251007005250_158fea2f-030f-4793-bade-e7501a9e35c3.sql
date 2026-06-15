-- CRITICAL SECURITY FIX: Enable Row Level Security on Talent Pool Tables
-- This prevents public access to sensitive user credentials and personal data

-- Enable RLS on talent_pool_users (contains email addresses and password hashes)
ALTER TABLE public.talent_pool_users ENABLE ROW LEVEL SECURITY;

-- Enable RLS on student_profiles (contains personal information)
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on company_profiles (contains company contact information)
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on talent_pool_payments (contains payment data)
ALTER TABLE public.talent_pool_payments ENABLE ROW LEVEL SECURITY;

-- Enable RLS on talent_pool_payment_receipts (contains payment receipts)
ALTER TABLE public.talent_pool_payment_receipts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on talent_pool_logs (contains audit logs)
ALTER TABLE public.talent_pool_logs ENABLE ROW LEVEL SECURITY;

-- Verify RLS is now enabled on all tables
DO $$
DECLARE
  unprotected_tables TEXT[];
  table_name TEXT;
BEGIN
  -- Check for any tables that still don't have RLS enabled
  SELECT ARRAY_AGG(tablename)
  INTO unprotected_tables
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'talent_pool_users',
      'student_profiles', 
      'company_profiles',
      'talent_pool_payments',
      'talent_pool_payment_receipts',
      'talent_pool_logs'
    )
    AND rowsecurity = false;
  
  IF unprotected_tables IS NOT NULL THEN
    RAISE EXCEPTION 'CRITICAL: RLS still disabled on tables: %. Migration failed.', 
      array_to_string(unprotected_tables, ', ');
  END IF;
  
  -- Log success
  RAISE NOTICE 'SUCCESS: RLS enabled on all talent pool tables. User credentials and personal data are now protected.';
  
  -- List the protected tables for confirmation
  FOR table_name IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename IN (
        'talent_pool_users',
        'student_profiles', 
        'company_profiles',
        'talent_pool_payments',
        'talent_pool_payment_receipts',
        'talent_pool_logs'
      )
      AND rowsecurity = true
    ORDER BY tablename
  LOOP
    RAISE NOTICE '  ✓ % - RLS enabled', table_name;
  END LOOP;
END $$;