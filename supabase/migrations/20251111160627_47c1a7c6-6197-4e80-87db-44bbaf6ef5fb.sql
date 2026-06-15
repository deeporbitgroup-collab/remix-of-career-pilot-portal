-- Update associate_request_status enum to include new statuses
ALTER TYPE associate_request_status ADD VALUE IF NOT EXISTS 'waiting_availability';
ALTER TYPE associate_request_status ADD VALUE IF NOT EXISTS 'availability_provided';
ALTER TYPE associate_request_status ADD VALUE IF NOT EXISTS 'awaiting_payment';
ALTER TYPE associate_request_status ADD VALUE IF NOT EXISTS 'confirmed_paid';