-- Add new values to existing pathways_category enum
ALTER TYPE pathways_category ADD VALUE IF NOT EXISTS 'UNIVERSITY';
ALTER TYPE pathways_category ADD VALUE IF NOT EXISTS 'INTERNSHIP';
ALTER TYPE pathways_category ADD VALUE IF NOT EXISTS 'LANGUAGE_COURSE';
ALTER TYPE pathways_category ADD VALUE IF NOT EXISTS 'VOLUNTEERING';
ALTER TYPE pathways_category ADD VALUE IF NOT EXISTS 'EXPERIENCE';