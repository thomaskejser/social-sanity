-- Marks when Claude last looked the channel up.
ALTER TABLE channel ADD COLUMN enriched_at BIGINT;
