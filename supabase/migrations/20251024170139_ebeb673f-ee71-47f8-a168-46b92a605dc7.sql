-- Test hash computation with actual password 
SELECT id, email, role, status, password_hash,
       encode(convert_to(encode(digest('Carlo.Marigliano04', 'sha256'), 'hex'), 'UTF8'), 'base64') as expected_hash,
       encode(convert_to(encode(digest('Carlo.Marigliano04', 'sha256'), 'hex'), 'UTF8'), 'base64') = password_hash as match
FROM pathways_users 
WHERE email = 'careerpilot2025@gmail.com';

-- Update the password hash to match the frontend hashing exactly
UPDATE pathways_users 
SET password_hash = encode(convert_to(encode(digest('Carlo.Marigliano04', 'sha256'), 'hex'), 'UTF8'), 'base64')
WHERE email = 'careerpilot2025@gmail.com';