-- Rebuilds content_source so a source can belong to a company. Run with foreign keys off.
-- SQLite will not write rows that refer to a missing table, so company is created first, as in
-- schema.sql at the time of this migration.
CREATE TABLE IF NOT EXISTS company (
	company_id           BIGINT NOT NULL PRIMARY KEY,
	company              TEXT   NOT NULL,
	website              TEXT   NOT NULL DEFAULT '',
	notes                TEXT   NOT NULL DEFAULT '',
	kudos                BIGINT NOT NULL DEFAULT 0 CHECK (kudos BETWEEN 0 AND 10),
	google_resource_name TEXT   NOT NULL DEFAULT '',
	created_at           BIGINT NOT NULL,
	updated_at           BIGINT NOT NULL
);

CREATE TABLE content_source_new (
	content_source_id  BIGINT NOT NULL PRIMARY KEY,
	content_source     TEXT   NOT NULL,
	human_id           BIGINT REFERENCES human ON DELETE CASCADE,
	company_id         BIGINT REFERENCES company ON DELETE CASCADE,
	publisher_id       BIGINT REFERENCES publisher ON DELETE CASCADE,
	feed_uri           TEXT   NOT NULL DEFAULT '',
	last_fetched_at    BIGINT,
	last_fetch_ok      BIGINT,
	last_fetch_message TEXT,
	CHECK ((human_id IS NOT NULL) + (company_id IS NOT NULL) + (publisher_id IS NOT NULL) = 1)
);

INSERT INTO content_source_new (content_source_id, content_source, human_id, company_id, publisher_id,
                                feed_uri, last_fetched_at, last_fetch_ok, last_fetch_message)
SELECT content_source_id, content_source, human_id, NULL, publisher_id,
       feed_uri, last_fetched_at, last_fetch_ok, last_fetch_message
FROM content_source;

DROP TABLE content_source;

ALTER TABLE content_source_new RENAME TO content_source;
