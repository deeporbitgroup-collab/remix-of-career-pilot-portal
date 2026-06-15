-- Update Take Off prices
UPDATE client_services SET price = 100.00 WHERE name = 'Personalized Timeline' AND category = 'Take Off';
UPDATE client_services SET price = 90.00 WHERE name = 'Comparative Presentations' AND category = 'Take Off';
UPDATE client_services SET price = 65.00 WHERE name = 'In-Depth Presentations' AND category = 'Take Off';

-- Update Layover prices
UPDATE client_services SET price = 120.00 WHERE name = 'Personalized Timeline' AND category = 'Layover';
UPDATE client_services SET price = 95.00 WHERE name = 'Comparative Presentations' AND category = 'Layover';
UPDATE client_services SET price = 70.00 WHERE name = 'In-Depth Presentations' AND category = 'Layover';

-- Update Altitude prices
UPDATE client_services SET price = 200.00 WHERE name = 'Personalized Career Roadmap' AND category = 'Altitude';

-- Update Summit prices
UPDATE client_services SET price = 110.00 WHERE name = 'Comparative Analysis' AND category = 'Summit';
UPDATE client_services SET price = 150.00 WHERE name = 'Personalized Timeline' AND category = 'Summit';
UPDATE client_services SET price = 80.00 WHERE name = 'In-Depth Presentations' AND category = 'Summit';
UPDATE client_services SET name = 'CV Rewriting / Cover Letter Rewriting', price = 100.00 WHERE name = 'CV Rewriting' AND category = 'Summit';

-- Update Talent Pool price to 10€/month
UPDATE client_services SET price = 10.00 WHERE name = 'Talent Pool' AND category = 'Additional Services';