-- Insert admin user for Pathways platform
-- Password: Carlo.Marigliano04
-- The password is hashed using SHA-256 and then base64 encoded

INSERT INTO pathways_users (
  email,
  password_hash,
  role,
  first_name,
  last_name,
  phone,
  school,
  status
)
VALUES (
  'careerpilot2025@gmail.com',
  'YjM5YWRiNDRlZmJhMGNhNWQxMzg5NWI0YjkzOTU5YjY4NTUyYjJlZTY1NGU1YjYyMDg3MjMzYzU4YzY3NTQ3Yg==',
  'ADMIN',
  'Career',
  'Pilot',
  NULL,
  NULL,
  'active'
)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role,
    status = EXCLUDED.status;