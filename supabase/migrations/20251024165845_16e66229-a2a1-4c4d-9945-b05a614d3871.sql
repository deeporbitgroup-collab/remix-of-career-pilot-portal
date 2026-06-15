-- Ensure pgcrypto is available to compute SHA-256
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Set admin password hash using the same scheme as frontend (SHA-256 -> hex -> base64)
UPDATE pathways_users
SET password_hash = encode(convert_to(encode(digest('Carlo.Marigliano04','sha256'),'hex'),'UTF8'),'base64')
WHERE email = 'careerpilot2025@gmail.com';