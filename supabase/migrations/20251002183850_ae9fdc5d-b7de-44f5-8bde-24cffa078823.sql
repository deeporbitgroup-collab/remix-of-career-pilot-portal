-- Disabilita RLS per le tabelle della Talent Pool
-- Queste tabelle hanno controllo accessi a livello applicativo

ALTER TABLE talent_pool_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_pool_payment_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_pool_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE talent_pool_logs DISABLE ROW LEVEL SECURITY;