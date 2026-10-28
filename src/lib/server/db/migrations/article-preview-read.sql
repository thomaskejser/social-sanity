-- Adds a preview picture and a read mark to articles.
ALTER TABLE article ADD COLUMN image_url TEXT NOT NULL DEFAULT '';
ALTER TABLE article ADD COLUMN image_checked_at BIGINT;
ALTER TABLE article ADD COLUMN read_at BIGINT;
