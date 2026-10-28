CREATE TABLE external_reference_new (
	external_reference_id BIGINT NOT NULL PRIMARY KEY,
	source                TEXT   NOT NULL CHECK (source IN ('GOOGLE_CONTACTS', 'YOUTUBE', 'REDDIT')),
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

INSERT INTO external_reference_new
SELECT external_reference_id, source, external_reference, human_id, company_id, channel_id,
       publisher_id, created_at
FROM external_reference;

DROP TABLE external_reference;
ALTER TABLE external_reference_new RENAME TO external_reference;
