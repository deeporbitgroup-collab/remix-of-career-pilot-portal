-- Update the Half-Day Outreach Sprint service name and description
UPDATE public.client_services 
SET 
  name = '100 Emails Outreach Sprint',
  description = 'We send 100 targeted outreach emails under your name to companies where your profile has the best chances (based on your CV). Where available, we also leverage internal team contacts to surface opportunities faster.'
WHERE name = 'Half-Day Outreach Sprint';