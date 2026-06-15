-- Set the password hash to match exactly what the frontend generates
UPDATE pathways_users 
SET password_hash = 'Y2U4YmNkODc1NGYyMWIwZTU1MDBmODEwNWViMWM1ZjI2ZjZiNGU3ZDdmOGRmYTA3OWZlNzNjNDcwYzYyN2VjMQ=='
WHERE email = 'careerpilot2025@gmail.com';

-- Test the login query that the frontend is making
SELECT * FROM pathways_users 
WHERE email = 'careerpilot2025@gmail.com' 
AND password_hash = 'Y2U4YmNkODc1NGYyMWIwZTU1MDBmODEwNWViMWM1ZjI2ZjZiNGU3ZDdmOGRmYTA3OWZlNzNjNDcwYzYyN2VjMQ==';