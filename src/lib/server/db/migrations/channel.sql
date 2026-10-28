-- Moves channels out of publisher into their own table, and lets content sources and external
-- references belong to a channel. Channels keep their IDs. Run with foreign keys off.
CREATE TABLE IF NOT EXISTS channel (
	channel_id BIGINT NOT NULL PRIMARY KEY,
	channel    TEXT   NOT NULL,
	website    TEXT   NOT NULL DEFAULT '',
	notes      TEXT   NOT NULL DEFAULT '',
	kudos      BIGINT NOT NULL DEFAULT 0 CHECK (kudos BETWEEN 0 AND 10),
	created_at BIGINT NOT NULL,
	updated_at BIGINT NOT NULL
);

INSERT INTO channel (channel_id, channel, kudos, created_at, updated_at)
SELECT publisher_id, publisher, kudos, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000
FROM publisher
WHERE publisher_kind = 'CHANNEL';

CREATE TABLE content_source_new (
	content_source_id  BIGINT NOT NULL PRIMARY KEY,
	content_source     TEXT   NOT NULL,
	human_id           BIGINT REFERENCES human ON DELETE CASCADE,
	company_id         BIGINT REFERENCES company ON DELETE CASCADE,
	channel_id         BIGINT REFERENCES channel ON DELETE CASCADE,
	publisher_id       BIGINT REFERENCES publisher ON DELETE CASCADE,
	feed_uri           TEXT   NOT NULL DEFAULT '',
	last_fetched_at    BIGINT,
	last_fetch_ok      BIGINT,
	last_fetch_message TEXT,
	CHECK ((human_id IS NOT NULL) + (company_id IS NOT NULL) + (channel_id IS NOT NULL)
	       + (publisher_id IS NOT NULL) = 1)
);

INSERT INTO content_source_new (content_source_id, content_source, human_id, company_id,
                                channel_id, publisher_id, feed_uri, last_fetched_at,
                                last_fetch_ok, last_fetch_message)
SELECT s.content_source_id, s.content_source, s.human_id, s.company_id,
       CASE WHEN p.publisher_kind = 'CHANNEL' THEN s.publisher_id END,
       CASE WHEN p.publisher_kind = 'CHANNEL' THEN NULL ELSE s.publisher_id END,
       s.feed_uri, s.last_fetched_at, s.last_fetch_ok, s.last_fetch_message
FROM content_source s
LEFT JOIN publisher p ON p.publisher_id = s.publisher_id;

DROP TABLE content_source;
ALTER TABLE content_source_new RENAME TO content_source;

CREATE TABLE external_reference_new (
	external_reference_id BIGINT NOT NULL PRIMARY KEY,
	source                TEXT   NOT NULL CHECK (source IN ('GOOGLE_CONTACTS', 'YOUTUBE')),
	external_reference    TEXT   NOT NULL,
	human_id              BIGINT REFERENCES human ON DELETE CASCADE,
	company_id            BIGINT REFERENCES company ON DELETE CASCADE,
	channel_id            BIGINT REFERENCES channel ON DELETE CASCADE,
	publisher_id          BIGINT REFERENCES publisher ON DELETE CASCADE,
	created_at            BIGINT NOT NULL,
	UNIQUE (source, external_reference),
	CHECK ((human_id IS NOT NULL) + (company_id IS NOT NULL) + (channel_id IS NOT NULL)
	       + (publisher_id IS NOT NULL) = 1)
);

INSERT INTO external_reference_new (external_reference_id, source, external_reference, human_id,
                                    company_id, channel_id, publisher_id, created_at)
SELECT r.external_reference_id, r.source, r.external_reference, r.human_id, r.company_id,
       CASE WHEN p.publisher_kind = 'CHANNEL' THEN r.publisher_id END,
       CASE WHEN p.publisher_kind = 'CHANNEL' THEN NULL ELSE r.publisher_id END,
       r.created_at
FROM external_reference r
LEFT JOIN publisher p ON p.publisher_id = r.publisher_id;

DROP TABLE external_reference;
ALTER TABLE external_reference_new RENAME TO external_reference;

DELETE FROM publisher
WHERE publisher_kind = 'CHANNEL';

-- Channels added from YouTube get their channel as a social account, as humans and companies do.
CREATE TABLE IF NOT EXISTS channel_social_account (
	channel_social_account_id BIGINT NOT NULL PRIMARY KEY,
	channel_id                BIGINT NOT NULL REFERENCES channel ON DELETE CASCADE,
	platform                  TEXT   NOT NULL,
	channel_social_account    TEXT   NOT NULL,
	UNIQUE (channel_id, channel_social_account)
);

INSERT INTO channel_social_account (channel_social_account_id, channel_id, platform,
                                    channel_social_account)
SELECT ROW_NUMBER() OVER (ORDER BY channel_id), channel_id, 'youtube',
       'https://www.youtube.com/channel/' || external_reference
FROM external_reference
WHERE source = 'YOUTUBE'
  AND channel_id IS NOT NULL;
