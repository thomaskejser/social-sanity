-- Marks when Claude last looked the human up.
ALTER TABLE human ADD COLUMN enriched_at BIGINT;
