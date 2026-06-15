-- Test the exact hash that the frontend generates
WITH test_hash AS (
  SELECT encode(convert_to(encode(digest('Carlo.Marigliano04', 'sha256'), 'hex'), 'UTF8'), 'base64') as frontend_hash
)
SELECT 
  u.email,
  u.password_hash as db_hash,
  th.frontend_hash,
  (u.password_hash = th.frontend_hash) as hashes_match,
  length(u.password_hash) as db_hash_length,
  length(th.frontend_hash) as frontend_hash_length
FROM pathways_users u, test_hash th 
WHERE u.email = 'careerpilot2025@gmail.com';