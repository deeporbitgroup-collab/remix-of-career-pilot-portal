-- Create Additional Call services for each tier
INSERT INTO client_services (name, category, description, price, requires_associate, requires_university, requires_sector, is_subscription)
VALUES 
  ('Additional Call with Associate', 'Layover', 'Book an extra call with your assigned Associate to discuss further questions', 40.00, true, false, false, false),
  ('Additional Call with Associate', 'Take Off', 'Book an extra call with your assigned Associate to discuss further questions', 40.00, true, false, false, false),
  ('Additional Call with Associate', 'Summit', 'Book an extra call with your assigned Associate to discuss further questions', 50.00, true, false, false, false),
  ('Additional Call with Associate', 'Altitude', 'Book an extra call with your assigned Associate to discuss further questions', 60.00, true, false, false, false);