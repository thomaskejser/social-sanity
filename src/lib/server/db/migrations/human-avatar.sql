CREATE TABLE IF NOT EXISTS human_avatar (
	human_avatar_id BIGINT NOT NULL PRIMARY KEY,
	human_id        BIGINT NOT NULL REFERENCES human ON DELETE CASCADE,
	position        BIGINT NOT NULL,
	content_type    TEXT   NOT NULL,
	image           BLOB   NOT NULL,
	source_url      TEXT   NOT NULL,
	fetched_at      BIGINT NOT NULL,
	UNIQUE (human_id, source_url)
);

INSERT INTO human_avatar (human_avatar_id, human_id, position, content_type, image, source_url,
                          fetched_at)
SELECT avatar_id, human_id, 0, content_type, image, source_url, fetched_at
FROM avatar
WHERE human_id IS NOT NULL;

CREATE TABLE avatar_new (
	avatar_id    BIGINT NOT NULL PRIMARY KEY,
	company_id   BIGINT UNIQUE REFERENCES company ON DELETE CASCADE,
	channel_id   BIGINT UNIQUE REFERENCES channel ON DELETE CASCADE,
	content_type TEXT   NOT NULL,
	image        BLOB   NOT NULL,
	source_url   TEXT   NOT NULL,
	fetched_at   BIGINT NOT NULL,
	CHECK ((company_id IS NOT NULL) + (channel_id IS NOT NULL) = 1)
);

INSERT INTO avatar_new (avatar_id, company_id, channel_id, content_type, image, source_url,
                        fetched_at)
SELECT avatar_id, company_id, channel_id, content_type, image, source_url, fetched_at
FROM avatar
WHERE human_id IS NULL;

DROP TABLE avatar;
ALTER TABLE avatar_new RENAME TO avatar;
