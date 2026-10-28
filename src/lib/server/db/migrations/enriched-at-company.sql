-- Marks when Claude last looked the company up.
ALTER TABLE company ADD COLUMN enriched_at BIGINT;
