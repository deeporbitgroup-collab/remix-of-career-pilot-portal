-- Fix the password hash by removing newlines
UPDATE pathways_users 
SET password_hash = REPLACE(password_hash, E'\n', '')
WHERE email = 'careerpilot2025@gmail.com';

-- Verify the fix
SELECT 
  email,
  password_hash,
  length(password_hash) as hash_length,
  (password_hash = encode(convert_to(encode(digest('Carlo.Marigliano04', 'sha256'), 'hex'), 'UTF8'), 'base64')) as hash_matches_expected
FROM pathways_users 
WHERE email = 'careerpilot2025@gmail.com';